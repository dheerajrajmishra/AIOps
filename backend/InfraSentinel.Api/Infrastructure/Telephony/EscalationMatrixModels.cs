namespace InfraSentinel.Api.Infrastructure.Telephony;

public record EscalationLayer(
    int Layer,
    string Role,
    string PicName,
    string PhoneNumber,
    int TimeoutSeconds = 300,
    string Channel = "Voice Call (Twilio)"
);

public record EscalationGroup(
    string Id,
    string Name,
    string Team,
    string Application,
    string Severity,
    List<EscalationLayer> Layers,
    string Description = ""
);

public record LayerDispatchAudit(
    int Layer,
    string Role,
    string PicName,
    string PhoneNumber,
    string CallSid,
    string Status,
    string Details,
    DateTimeOffset Timestamp
);

public record MultiLayerCallResult(
    bool Success,
    string GroupName,
    string Team,
    string Application,
    int TotalLayers,
    List<LayerDispatchAudit> DispatchedLayers,
    string Summary
);
