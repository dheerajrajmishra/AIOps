using System.Text.Json;

namespace InfraSentinel.Api.Core.Interfaces;

public record ToolExecutionContext(
    Guid RunId,
    string StepKey,
    string? TargetHost,
    JsonElement Parameters,
    CancellationToken CancellationToken
);

public record ToolExecutionResult(
    string Status, // "PASS", "FAIL", "ERROR"
    string MetricValue,
    string? RawOutput = null,
    string? ErrorMessage = null
);

public interface IToolExecutor
{
    string ToolType { get; }
    Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context);
}
