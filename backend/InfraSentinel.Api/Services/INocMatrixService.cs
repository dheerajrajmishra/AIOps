using Dapper;
using InfraSentinel.Api.Infrastructure.Data;

namespace InfraSentinel.Api.Services;

public record NocOverviewStats(
    int TotalHosts,
    int TotalWorkflows,
    int ActiveWorkflows,
    int TotalRuns24h,
    int FailedRuns24h,
    double SuccessRate24h,
    int ActiveIncidents,
    double AvgDurationMs
);

public record HostHealthItem(
    string TargetHost,
    string OverallStatus, // "HEALTHY" | "WARNING" | "CRITICAL"
    DateTimeOffset LastCheckedAt,
    int TotalChecks,
    int PassCount,
    int FailCount,
    double UptimePercent,
    string CheckTypes,
    string RecentMetricValue,
    string? RecentError,
    List<HostSparklinePoint> History
);

public record HostSparklinePoint(
    string Status,
    long DurationMs,
    DateTimeOffset ExecutedAt
);

public record NocIncidentItem(
    Guid RunId,
    string WorkflowName,
    string StepKey,
    string TargetHost,
    string CheckType,
    string Status,
    string MetricValue,
    string? ErrorMessage,
    long DurationMs,
    DateTimeOffset ExecutedAt
);

public record NocMatrixResponse(
    NocOverviewStats Overview,
    List<HostHealthItem> Hosts,
    List<NocIncidentItem> RecentIncidents,
    AiInferenceReport? AiInference = null
);

public interface INocMatrixService
{
    Task<NocMatrixResponse> GetMatrixDataAsync();
}

public class NocMatrixService : INocMatrixService
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly IAiInferenceService _aiInferenceService;

    public NocMatrixService(ISqlConnectionFactory connectionFactory, IAiInferenceService aiInferenceService)
    {
        _connectionFactory = connectionFactory;
        _aiInferenceService = aiInferenceService;
    }

    public async Task<NocMatrixResponse> GetMatrixDataAsync()
    {
        using var connection = _connectionFactory.CreateConnection();

        // 1. Overview Stats using Dapper aggregation
        var statsSql = @"
            DECLARE @Since24h DATETIMEOFFSET = DATEADD(HOUR, -24, SYSDATETIMEOFFSET());

            SELECT
                (SELECT COUNT(DISTINCT TargetHost) FROM StepExecutionLogs WHERE TargetHost IS NOT NULL AND TargetHost <> '') AS TotalHosts,
                (SELECT COUNT(1) FROM Workflows) AS TotalWorkflows,
                (SELECT COUNT(1) FROM Workflows WHERE IsActive = 1) AS ActiveWorkflows,
                (SELECT COUNT(1) FROM WorkflowRuns WHERE StartedAt >= @Since24h) AS TotalRuns24h,
                (SELECT COUNT(1) FROM WorkflowRuns WHERE StartedAt >= @Since24h AND Status = 'FAILED') AS FailedRuns24h,
                (SELECT COUNT(1) FROM StepExecutionLogs WHERE ExecutedAt >= @Since24h AND Status IN ('FAIL', 'ERROR')) AS ActiveIncidents,
                ISNULL((SELECT AVG(CAST(DATEDIFF(MILLISECOND, StartedAt, CompletedAt) AS FLOAT)) FROM WorkflowRuns WHERE CompletedAt IS NOT NULL AND StartedAt >= @Since24h), 0) AS AvgDurationMs;
        ";

        var rawStats = await connection.QueryFirstOrDefaultAsync<dynamic>(statsSql);

        int totalRuns24h = rawStats?.TotalRuns24h ?? 0;
        int failedRuns24h = rawStats?.FailedRuns24h ?? 0;
        double successRate = totalRuns24h > 0
            ? Math.Round(((double)(totalRuns24h - failedRuns24h) / totalRuns24h) * 100.0, 1)
            : 100.0;

        var overview = new NocOverviewStats(
            TotalHosts: rawStats?.TotalHosts ?? 0,
            TotalWorkflows: rawStats?.TotalWorkflows ?? 0,
            ActiveWorkflows: rawStats?.ActiveWorkflows ?? 0,
            TotalRuns24h: totalRuns24h,
            FailedRuns24h: failedRuns24h,
            SuccessRate24h: successRate,
            ActiveIncidents: rawStats?.ActiveIncidents ?? 0,
            AvgDurationMs: Math.Round((double)(rawStats?.AvgDurationMs ?? 0), 0)
        );

        // 2. Query distinct hosts and their check statistics
        var hostsSql = @"
            WITH HostLatest AS (
                SELECT 
                    TargetHost,
                    StepKey,
                    CheckType,
                    Status,
                    MetricValue,
                    ErrorMessage,
                    ExecutedAt,
                    ROW_NUMBER() OVER(PARTITION BY TargetHost ORDER BY ExecutedAt DESC) AS rn
                FROM StepExecutionLogs
                WHERE TargetHost IS NOT NULL AND TargetHost <> ''
            ),
            HostAgg AS (
                SELECT 
                    TargetHost,
                    COUNT(1) AS TotalChecks,
                    SUM(CASE WHEN Status = 'PASS' THEN 1 ELSE 0 END) AS PassCount,
                    SUM(CASE WHEN Status IN ('FAIL', 'ERROR') THEN 1 ELSE 0 END) AS FailCount,
                    MAX(ExecutedAt) AS LastCheckedAt
                FROM StepExecutionLogs
                WHERE TargetHost IS NOT NULL AND TargetHost <> ''
                GROUP BY TargetHost
            )
            SELECT 
                a.TargetHost,
                a.TotalChecks,
                a.PassCount,
                a.FailCount,
                a.LastCheckedAt,
                l.Status AS LatestStatus,
                l.MetricValue AS RecentMetricValue,
                l.ErrorMessage AS RecentError,
                l.CheckType AS LatestCheckType
            FROM HostAgg a
            INNER JOIN HostLatest l ON a.TargetHost = l.TargetHost AND l.rn = 1
            ORDER BY a.FailCount DESC, a.LastCheckedAt DESC;
        ";

        var hostRows = (await connection.QueryAsync<dynamic>(hostsSql)).ToList();

        // 3. Query recent sparklines for hosts
        var sparklineSql = @"
            WITH RecentLogs AS (
                SELECT 
                    TargetHost,
                    Status,
                    DurationMs,
                    ExecutedAt,
                    ROW_NUMBER() OVER(PARTITION BY TargetHost ORDER BY ExecutedAt DESC) AS rn
                FROM StepExecutionLogs
                WHERE TargetHost IS NOT NULL AND TargetHost <> ''
            )
            SELECT TargetHost, Status, DurationMs, ExecutedAt
            FROM RecentLogs
            WHERE rn <= 10
            ORDER BY ExecutedAt ASC;
        ";

        var sparklineRows = (await connection.QueryAsync<dynamic>(sparklineSql)).ToList();
        var sparklineLookup = sparklineRows
            .GroupBy(r => (string)r.TargetHost)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new HostSparklinePoint((string)r.Status, (long)r.DurationMs, (DateTimeOffset)r.ExecutedAt)).ToList()
            );

        var hostItems = new List<HostHealthItem>();
        foreach (var hr in hostRows)
        {
            string host = hr.TargetHost;
            int total = hr.TotalChecks;
            int pass = hr.PassCount;
            int fail = hr.FailCount;
            string latestStatus = hr.LatestStatus;

            double uptime = total > 0 ? Math.Round(((double)pass / total) * 100.0, 1) : 100.0;
            string overall = latestStatus == "FAIL" || latestStatus == "ERROR" 
                ? "CRITICAL" 
                : (fail > 0 ? "WARNING" : "HEALTHY");

            var history = sparklineLookup.TryGetValue(host, out var pts) ? pts : new List<HostSparklinePoint>();

            hostItems.Add(new HostHealthItem(
                TargetHost: host,
                OverallStatus: overall,
                LastCheckedAt: hr.LastCheckedAt,
                TotalChecks: total,
                PassCount: pass,
                FailCount: fail,
                UptimePercent: uptime,
                CheckTypes: hr.LatestCheckType ?? "DIAGNOSTIC",
                RecentMetricValue: hr.RecentMetricValue ?? "N/A",
                RecentError: hr.RecentError,
                History: history
            ));
        }

        // 4. Query recent incidents / alerts
        var incidentSql = @"
            SELECT TOP 20
                l.RunId,
                ISNULL(w.Name, 'Manual Diagnostic') AS WorkflowName,
                l.StepKey,
                l.TargetHost,
                l.CheckType,
                l.Status,
                l.MetricValue,
                l.ErrorMessage,
                l.DurationMs,
                l.ExecutedAt
            FROM StepExecutionLogs l
            LEFT JOIN WorkflowRuns r ON l.RunId = r.Id
            LEFT JOIN Workflows w ON r.WorkflowId = w.Id
            WHERE l.Status IN ('FAIL', 'ERROR') OR l.CheckType = 'VOICE_CALL_ACTION'
            ORDER BY l.ExecutedAt DESC;
        ";

        var incidentRows = await connection.QueryAsync<dynamic>(incidentSql);
        var incidents = incidentRows.Select(i => new NocIncidentItem(
            RunId: (Guid)i.RunId,
            WorkflowName: (string)i.WorkflowName,
            StepKey: (string)i.StepKey,
            TargetHost: (string)i.TargetHost,
            CheckType: (string)i.CheckType,
            Status: (string)i.Status,
            MetricValue: (string)i.MetricValue,
            ErrorMessage: (string?)i.ErrorMessage,
            DurationMs: (long)i.DurationMs,
            ExecutedAt: (DateTimeOffset)i.ExecutedAt
        )).ToList();

        var aiReport = await _aiInferenceService.GenerateInferenceReportAsync();
        return new NocMatrixResponse(overview, hostItems, incidents, aiReport);
    }
}
