using InfraSentinel.Api.Engine;
using Quartz;

namespace InfraSentinel.Api.Scheduling;

[DisallowConcurrentExecution]
public class WorkflowJob : IJob
{
    private readonly ILogger<WorkflowJob> _logger;
    private readonly IServiceProvider _serviceProvider;

    public WorkflowJob(ILogger<WorkflowJob> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var workflowIdStr = context.MergedJobDataMap.GetString("WorkflowId");
        if (string.IsNullOrWhiteSpace(workflowIdStr) || !Guid.TryParse(workflowIdStr, out var workflowId))
        {
            _logger.LogError("WorkflowJob triggered without valid WorkflowId.");
            return;
        }

        _logger.LogInformation("Quartz triggered scheduled execution for WorkflowId: {WorkflowId}", workflowId);

        using var scope = _serviceProvider.CreateScope();
        var dagEngine = scope.ServiceProvider.GetRequiredService<IDagExecutionEngine>();

        try
        {
            await dagEngine.ExecuteWorkflowAsync(workflowId, "SCHEDULED", context.CancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Scheduled execution failed for WorkflowId: {WorkflowId}", workflowId);
        }
    }
}
