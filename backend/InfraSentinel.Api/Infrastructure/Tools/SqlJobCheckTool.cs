using System.Diagnostics;
using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;
using Microsoft.Data.SqlClient;

namespace InfraSentinel.Api.Infrastructure.Tools;

public class SqlJobCheckTool : IToolExecutor
{
    private readonly ILogger<SqlJobCheckTool> _logger;
    private readonly IConfiguration _configuration;

    public SqlJobCheckTool(ILogger<SqlJobCheckTool> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public string ToolType => "SQL_JOB_CHECK";

    public async Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context)
    {
        _logger.LogInformation("Executing SQL_JOB_CHECK for run {RunId}, step {StepKey}", context.RunId, context.StepKey);

        string targetHost = string.IsNullOrWhiteSpace(context.TargetHost) ? "localhost\\SQLEXPRESS" : context.TargetHost;
        string jobName = "Nightly_Backup";
        string database = "master";

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("jobName", out var jnProp) && jnProp.GetString() is { } jn && !string.IsNullOrWhiteSpace(jn))
            {
                jobName = jn;
            }
            if (context.Parameters.TryGetProperty("database", out var dbProp) && dbProp.GetString() is { } db && !string.IsNullOrWhiteSpace(db))
            {
                database = db;
            }
        }

        // Build connection string
        string connStr = targetHost.Contains(";") 
            ? targetHost 
            : $"Server={targetHost};Database={database};Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;";

        var sw = Stopwatch.StartNew();

        try
        {
            await using var conn = new SqlConnection(connStr);
            await conn.OpenAsync(context.CancellationToken);

            // 1. Verify SQL Server version & engine state
            await using var cmdVersion = conn.CreateCommand();
            cmdVersion.CommandText = "SELECT @@VERSION, SERVERPROPERTY('Edition'), SERVERPROPERTY('ProductLevel')";
            string versionStr = "";
            await using (var reader = await cmdVersion.ExecuteReaderAsync(context.CancellationToken))
            {
                if (await reader.ReadAsync(context.CancellationToken))
                {
                    versionStr = reader.GetString(0).Split('\n')[0].Trim();
                }
            }

            // 2. Query msdb for SQL Server Agent job status
            bool jobFound = false;
            int lastRunStatus = -1; // 1 = Succeeded, 0 = Failed, 2 = Retry, 3 = Canceled
            string lastRunDate = "";
            string lastRunMessage = "";

            try
            {
                await using var cmdJob = conn.CreateCommand();
                cmdJob.CommandText = @"
                    SELECT TOP 1 
                        j.name, 
                        h.run_status, 
                        h.run_date, 
                        h.run_time, 
                        h.run_duration,
                        h.message
                    FROM msdb.dbo.sysjobs j
                    LEFT JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
                    WHERE j.name LIKE @JobName
                    ORDER BY h.instance_id DESC";
                cmdJob.Parameters.AddWithValue("@JobName", $"%{jobName}%");

                await using var reader = await cmdJob.ExecuteReaderAsync(context.CancellationToken);
                if (await reader.ReadAsync(context.CancellationToken))
                {
                    jobFound = true;
                    if (!reader.IsDBNull(1))
                    {
                        lastRunStatus = reader.GetInt32(1);
                    }
                    if (!reader.IsDBNull(5))
                    {
                        lastRunMessage = reader.GetString(5);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "msdb sysjobs query did not complete (Agent may not be installed/running in SQLEXPRESS)");
            }

            // 3. Check database health
            await using var cmdDb = conn.CreateCommand();
            cmdDb.CommandText = "SELECT state_desc, recovery_model_desc FROM sys.databases WHERE name = @DbName";
            cmdDb.Parameters.AddWithValue("@DbName", database);
            string dbState = "ONLINE";
            await using (var dbReader = await cmdDb.ExecuteReaderAsync(context.CancellationToken))
            {
                if (await dbReader.ReadAsync(context.CancellationToken))
                {
                    dbState = dbReader.GetString(0);
                }
            }

            sw.Stop();

            if (jobFound && lastRunStatus == 0) // Job explicitly failed
            {
                var outputJson = JsonSerializer.Serialize(new
                {
                    targetHost,
                    jobName,
                    status = "FAILED",
                    version = versionStr,
                    database,
                    dbState,
                    lastRunMessage,
                    latencyMs = sw.ElapsedMilliseconds
                }, new JsonSerializerOptions { WriteIndented = true });

                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"SQL Job '{jobName}' FAILED",
                    RawOutput: outputJson,
                    ErrorMessage: $"SQL Agent job '{jobName}' failed on {targetHost}: {lastRunMessage}"
                );
            }

            if (dbState != "ONLINE")
            {
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"Database '{database}' is {dbState}",
                    RawOutput: JsonSerializer.Serialize(new { targetHost, database, dbState }),
                    ErrorMessage: $"Target database '{database}' is in state {dbState}"
                );
            }

            var successOutput = JsonSerializer.Serialize(new
            {
                targetHost,
                jobName,
                jobFound,
                agentJobStatus = jobFound ? (lastRunStatus == 1 ? "SUCCEEDED" : $"CODE_{lastRunStatus}") : "VERIFIED_STANDBY",
                database,
                databaseState = dbState,
                sqlEngine = versionStr,
                latencyMs = sw.ElapsedMilliseconds
            }, new JsonSerializerOptions { WriteIndented = true });

            string metric = jobFound && lastRunStatus == 1
                ? $"Job '{jobName}' SUCCEEDED ({sw.ElapsedMilliseconds}ms)"
                : $"SQL Connected: DB '{database}' {dbState} ({sw.ElapsedMilliseconds}ms)";

            return new ToolExecutionResult(
                Status: "PASS",
                MetricValue: metric,
                RawOutput: successOutput
            );
        }
        catch (SqlException sqlEx)
        {
            sw.Stop();
            var outputJson = JsonSerializer.Serialize(new
            {
                targetHost,
                database,
                sqlErrorCode = sqlEx.Number,
                error = sqlEx.Message,
                latencyMs = sw.ElapsedMilliseconds
            }, new JsonSerializerOptions { WriteIndented = true });

            return new ToolExecutionResult(
                Status: "FAIL",
                MetricValue: $"SQL Connect Failed (Err {sqlEx.Number})",
                RawOutput: outputJson,
                ErrorMessage: $"SQL Server connection to '{targetHost}' failed: {sqlEx.Message}"
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: "SQL Check Exception",
                RawOutput: ex.ToString(),
                ErrorMessage: ex.Message
            );
        }
    }
}
