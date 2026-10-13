using System.Collections.Concurrent;

namespace InfraSentinel.Api.Infrastructure.Telephony;

public interface IEscalationMatrixService
{
    Task<List<EscalationGroup>> GetAllGroupsAsync();
    Task<EscalationGroup?> GetGroupByIdAsync(string id);
    Task<EscalationGroup?> FindGroupByAppOrTeamAsync(string appOrTeam);
    Task<EscalationGroup> SaveGroupAsync(EscalationGroup group);
    Task<MultiLayerCallResult> ExecuteMultiLayerEscalationAsync(
        string? appOrTeam,
        int? specificLayer,
        string alertMessage,
        CancellationToken cancellationToken = default
    );
}

public class EscalationMatrixService : IEscalationMatrixService
{
    private readonly ITelephonyService _telephonyService;
    private readonly ILogger<EscalationMatrixService> _logger;
    private readonly ConcurrentDictionary<string, EscalationGroup> _groups = new();

    public EscalationMatrixService(ITelephonyService telephonyService, ILogger<EscalationMatrixService> logger)
    {
        _telephonyService = telephonyService;
        _logger = logger;
        SeedDefaultMatrices();
    }

    private void SeedDefaultMatrices()
    {
        var defaultGroups = new List<EscalationGroup>
        {
            new EscalationGroup(
                Id: "esc-payment-gateway",
                Name: "Core Banking & Payment Gateway Escalation",
                Team: "FinTech Core SRE",
                Application: "Payment Gateway",
                Severity: "CRITICAL",
                Description: "Tiered multi-layer on-call escalation for real-time payment clearance, SWIFT/ACH nodes, and credit settlement APIs.",
                Layers: new List<EscalationLayer>
                {
                    new(1, "L1 Primary Payment SRE", "Alex Chen", "+15550192834", 180, "Voice Call (Twilio Priority)"),
                    new(2, "L2 Payment Tech Lead", "Sarah Jenkins", "+15550198822", 300, "Voice Call + SMS"),
                    new(3, "L3 FinTech Engineering Director / IC", "David Miller", "+15550144991", 450, "Voice Call (Executive Urgent)")
                }
            ),
            new EscalationGroup(
                Id: "esc-sql-dba",
                Name: "Production SQL Server & Database Cluster",
                Team: "DBA Platform Ops",
                Application: "SQL Server Cluster",
                Severity: "CRITICAL",
                Description: "Database high availability, AlwaysOn replica health, log-shipping stalls, and disaster recovery escalation.",
                Layers: new List<EscalationLayer>
                {
                    new(1, "L1 On-Call DBA", "Marcus Vance", "+15550177334", 180, "Voice Call (Twilio)"),
                    new(2, "L2 Principal Database Architect", "Elena Rostova", "+15550166221", 300, "Voice Call + PagerDuty"),
                    new(3, "L3 Head of Data Infrastructure", "Robert Kim", "+15550133889", 600, "Voice Call (Incident Commander)")
                }
            ),
            new EscalationGroup(
                Id: "esc-secops-perimeter",
                Name: "SecOps Perimeter & Zero-Trust Gateway",
                Team: "Cyber Defense SecOps",
                Application: "Perimeter Gateway",
                Severity: "CRITICAL",
                Description: "Unscheduled RDP exposures, firewall anomaly detection, credential stuffing, and perimeter intrusion deterrence.",
                Layers: new List<EscalationLayer>
                {
                    new(1, "L1 SOC Analyst On-Duty", "Jordan Pike", "+15550122119", 120, "Voice Call (Immediate SOC Dispatch)"),
                    new(2, "L2 Senior Incident Responder", "Chloe Zhao", "+15550188443", 240, "Voice Call + Encrypted Comms"),
                    new(3, "L3 Chief Information Security Officer (CISO)", "Arthur Pendelton", "+15550199002", 400, "Voice Call (Executive SOC)")
                }
            ),
            new EscalationGroup(
                Id: "esc-api-edge",
                Name: "Public API Gateway & Microservice Mesh",
                Team: "Platform SRE",
                Application: "Public API",
                Severity: "HIGH",
                Description: "Edge CDN routing, ingress TLS termination, 5xx latency anomaly, and rate-limiting enforcement.",
                Layers: new List<EscalationLayer>
                {
                    new(1, "L1 Edge Traffic SRE", "Siddharth Rao", "+15550155442", 180, "Voice Call (Twilio)"),
                    new(2, "L2 Platform Services Lead", "Maya Lin", "+15550144331", 360, "Voice Call + Teams"),
                    new(3, "L3 VP of Cloud Infrastructure", "Carlos Gomez", "+15550111229", 600, "Voice Call (Leadership Esc)")
                }
            )
        };

        foreach (var group in defaultGroups)
        {
            _groups.TryAdd(group.Id, group);
        }
    }

    public Task<List<EscalationGroup>> GetAllGroupsAsync()
    {
        return Task.FromResult(_groups.Values.OrderBy(g => g.Application).ToList());
    }

    public Task<EscalationGroup?> GetGroupByIdAsync(string id)
    {
        _groups.TryGetValue(id, out var group);
        return Task.FromResult(group);
    }

    public Task<EscalationGroup?> FindGroupByAppOrTeamAsync(string appOrTeam)
    {
        if (string.IsNullOrWhiteSpace(appOrTeam))
            return Task.FromResult<EscalationGroup?>(_groups.Values.FirstOrDefault());

        var match = _groups.Values.FirstOrDefault(g =>
            g.Id.Equals(appOrTeam, StringComparison.OrdinalIgnoreCase) ||
            g.Application.Contains(appOrTeam, StringComparison.OrdinalIgnoreCase) ||
            g.Team.Contains(appOrTeam, StringComparison.OrdinalIgnoreCase) ||
            g.Name.Contains(appOrTeam, StringComparison.OrdinalIgnoreCase));

        return Task.FromResult(match ?? _groups.Values.FirstOrDefault());
    }

    public Task<EscalationGroup> SaveGroupAsync(EscalationGroup group)
    {
        var id = string.IsNullOrWhiteSpace(group.Id) ? $"esc-{Guid.NewGuid():N}[..8]" : group.Id;
        var updated = group with { Id = id };
        _groups[id] = updated;
        return Task.FromResult(updated);
    }

    public async Task<MultiLayerCallResult> ExecuteMultiLayerEscalationAsync(
        string? appOrTeam,
        int? specificLayer,
        string alertMessage,
        CancellationToken cancellationToken = default)
    {
        var group = await FindGroupByAppOrTeamAsync(appOrTeam ?? "");
        if (group == null || group.Layers.Count == 0)
        {
            return new MultiLayerCallResult(
                Success: false,
                GroupName: "Default",
                Team: "General SRE",
                Application: "InfraSentinel",
                TotalLayers: 0,
                DispatchedLayers: new List<LayerDispatchAudit>(),
                Summary: "No escalation matrix registered for requested application or team."
            );
        }

        var layersToCall = specificLayer.HasValue
            ? group.Layers.Where(l => l.Layer == specificLayer.Value).ToList()
            : group.Layers.OrderBy(l => l.Layer).ToList();

        if (layersToCall.Count == 0)
        {
            layersToCall = group.Layers.OrderBy(l => l.Layer).Take(1).ToList();
        }

        var audits = new List<LayerDispatchAudit>();
        foreach (var layer in layersToCall)
        {
            _logger.LogInformation("Escalating to Layer {Layer} ({Role}) - PIC {Name} at {Phone}",
                layer.Layer, layer.Role, layer.PicName, layer.PhoneNumber);

            var callReq = new TelephonyCallRequest(
                RecipientPhone: layer.PhoneNumber,
                PicName: layer.PicName,
                AlertMessage: $"[Escalation Layer {layer.Layer} - {group.Application} / {group.Team}]: {alertMessage}",
                Provider: "Twilio"
            );

            var res = await _telephonyService.DispatchVoiceCallAsync(callReq, cancellationToken);
            audits.Add(new LayerDispatchAudit(
                Layer: layer.Layer,
                Role: layer.Role,
                PicName: layer.PicName,
                PhoneNumber: layer.PhoneNumber,
                CallSid: res.CallSid,
                Status: res.Status,
                Details: res.Details,
                Timestamp: DateTimeOffset.UtcNow
            ));
        }

        var summary = $"Escalated to {audits.Count} tier(s) for [{group.Application}] (Team: {group.Team}). Lead responder: {audits.FirstOrDefault()?.PicName} ({audits.FirstOrDefault()?.Role}).";

        return new MultiLayerCallResult(
            Success: audits.Any(a => a.Status != "failed"),
            GroupName: group.Name,
            Team: group.Team,
            Application: group.Application,
            TotalLayers: group.Layers.Count,
            DispatchedLayers: audits,
            Summary: summary
        );
    }
}
