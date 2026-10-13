namespace InfraSentinel.Api.Hubs;

public interface IExecutionStreamClient
{
    Task ReceiveConsoleLog(Guid runId, string timestamp, string level, string message);
    Task ReceiveStepStarted(Guid runId, string stepKey, string toolType, string? targetHost);
    Task ReceiveStepCompleted(Guid runId, string stepKey, string status, string metricValue, long durationMs, string? rawOutput, string? errorMessage);
    Task ReceiveRunStatusChanged(Guid runId, string status, int totalSteps, int failedSteps);
    Task ReceiveRunCompleted(Guid runId, string status, int totalSteps, int failedSteps, long durationMs);
}
