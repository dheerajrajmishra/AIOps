using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;
using InfraSentinel.Api.Infrastructure.Telephony;

namespace InfraSentinel.Api.Infrastructure.Tools;

public class VoiceCallActionTool : IToolExecutor
{
    private readonly ILogger<VoiceCallActionTool> _logger;
    private readonly ITelephonyService _telephonyService;
    private readonly IEscalationMatrixService _escalationMatrixService;

    public VoiceCallActionTool(
        ILogger<VoiceCallActionTool> logger,
        ITelephonyService telephonyService,
        IEscalationMatrixService escalationMatrixService)
    {
        _logger = logger;
        _telephonyService = telephonyService;
        _escalationMatrixService = escalationMatrixService;
    }

    public string ToolType => "VOICE_CALL_ACTION";

    public async Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context)
    {
        _logger.LogInformation("Executing VOICE_CALL_ACTION for step {StepKey}", context.StepKey);

        string recipientPhone = "+15550192834";
        string picName = "Lead SRE On-Call";
        string message = "InfraSentinel Alert: Step failure detected in automated infrastructure runbook.";
        string provider = "Twilio";
        string? application = null;
        string? team = null;
        int? layer = null;
        bool useEscalationMatrix = false;

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("groupId", out var gidProp) && gidProp.GetString() is { } gid && !string.IsNullOrWhiteSpace(gid))
            {
                application = gid;
                useEscalationMatrix = true;
            }
            if (context.Parameters.TryGetProperty("application", out var appProp) && appProp.GetString() is { } a && !string.IsNullOrWhiteSpace(a))
            {
                application = a;
                useEscalationMatrix = true;
            }
            if (context.Parameters.TryGetProperty("team", out var teamProp) && teamProp.GetString() is { } t && !string.IsNullOrWhiteSpace(t))
            {
                team = t;
                useEscalationMatrix = true;
            }
            if (context.Parameters.TryGetProperty("layer", out var layerProp) && layerProp.TryGetInt32(out var l))
            {
                layer = l;
            }
            if (context.Parameters.TryGetProperty("recipientPhone", out var phoneProp) && phoneProp.GetString() is { } p && !string.IsNullOrWhiteSpace(p))
            {
                recipientPhone = p;
            }
            if (context.Parameters.TryGetProperty("picName", out var picProp) && picProp.GetString() is { } pn && !string.IsNullOrWhiteSpace(pn))
            {
                picName = pn;
            }
            if (context.Parameters.TryGetProperty("message", out var msgProp) && msgProp.GetString() is { } m && !string.IsNullOrWhiteSpace(m))
            {
                message = m;
            }
            if (context.Parameters.TryGetProperty("provider", out var provProp) && provProp.GetString() is { } pr && !string.IsNullOrWhiteSpace(pr))
            {
                provider = pr;
            }
        }

        try
        {
            // If application, team or multi-tier is configured, use N-Layer Escalation Matrix
            if (useEscalationMatrix || !string.IsNullOrWhiteSpace(application) || !string.IsNullOrWhiteSpace(team))
            {
                var query = !string.IsNullOrWhiteSpace(application) ? application : (team ?? "");
                var escalationResult = await _escalationMatrixService.ExecuteMultiLayerEscalationAsync(
                    appOrTeam: query,
                    specificLayer: layer,
                    alertMessage: message,
                    cancellationToken: context.CancellationToken
                );

                var rawOutputJson = JsonSerializer.Serialize(escalationResult, new JsonSerializerOptions { WriteIndented = true });

                if (escalationResult.Success)
                {
                    var primaryContact = escalationResult.DispatchedLayers.FirstOrDefault();
                    var contactStr = primaryContact != null ? $"{primaryContact.PicName} (L{primaryContact.Layer})" : escalationResult.Team;
                    return new ToolExecutionResult(
                        Status: "PASS",
                        MetricValue: $"Escalation Matrix Dispatched [{escalationResult.Application} / {escalationResult.Team}] -> {contactStr}",
                        RawOutput: rawOutputJson
                    );
                }
                else
                {
                    return new ToolExecutionResult(
                        Status: "FAIL",
                        MetricValue: "N-Layer Escalation Dispatch Failed",
                        RawOutput: rawOutputJson,
                        ErrorMessage: escalationResult.Summary
                    );
                }
            }

            // Fallback to direct single-target dispatch
            var callRequest = new TelephonyCallRequest(
                RecipientPhone: recipientPhone,
                PicName: picName,
                AlertMessage: message,
                Provider: provider
            );

            var callResponse = await _telephonyService.DispatchVoiceCallAsync(callRequest, context.CancellationToken);
            var outputJson = JsonSerializer.Serialize(callResponse, new JsonSerializerOptions { WriteIndented = true });

            if (callResponse.Success)
            {
                return new ToolExecutionResult(
                    Status: "PASS",
                    MetricValue: $"Voice Alert Dispatched -> {picName} ({callResponse.CallSid[..10]}...)",
                    RawOutput: outputJson
                );
            }
            else
            {
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: "Voice Call Dispatch Failed",
                    RawOutput: outputJson,
                    ErrorMessage: callResponse.Details
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute voice call action");
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: "Voice Call Exception",
                RawOutput: ex.ToString(),
                ErrorMessage: ex.Message
            );
        }
    }
}
