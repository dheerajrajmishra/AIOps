using InfraSentinel.Api.Core.Models;

namespace InfraSentinel.Api.Engine;

public interface IDagExecutionEngine
{
    Task<WorkflowRun> ExecuteWorkflowAsync(Guid workflowId, string triggerType = "MANUAL", CancellationToken cancellationToken = default);
}
