using InfraSentinel.Api.Core.Models;
using InfraSentinel.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Quartz;

namespace InfraSentinel.Api.Scheduling;

public interface IWorkflowSchedulerService
{
    Task ScheduleWorkflowAsync(Workflow workflow);
    Task UnscheduleWorkflowAsync(Guid workflowId);
    Task RescheduleAllAsync();
}

public class WorkflowSchedulerService : IHostedService, IWorkflowSchedulerService
{
    private readonly ILogger<WorkflowSchedulerService> _logger;
    private readonly ISchedulerFactory _schedulerFactory;
    private readonly IServiceProvider _serviceProvider;
    private IScheduler? _scheduler;

    public WorkflowSchedulerService(
        ILogger<WorkflowSchedulerService> logger,
        ISchedulerFactory schedulerFactory,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _schedulerFactory = schedulerFactory;
        _serviceProvider = serviceProvider;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Initializing Quartz WorkflowSchedulerService...");
        _scheduler = await _schedulerFactory.GetScheduler(cancellationToken);

        // Schedule all active workflows on startup
        await RescheduleAllAsync();
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_scheduler != null)
        {
            await _scheduler.Shutdown(waitForJobsToComplete: false, cancellationToken);
        }
    }

    public async Task RescheduleAllAsync()
    {
        if (_scheduler == null)
        {
            _scheduler = await _schedulerFactory.GetScheduler();
        }

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InfraSentinelDbContext>();

        var activeWorkflows = await db.Workflows
            .Where(w => w.IsActive && !string.IsNullOrEmpty(w.CronExpression))
            .ToListAsync();

        _logger.LogInformation("Found {Count} active workflows to schedule.", activeWorkflows.Count);

        foreach (var workflow in activeWorkflows)
        {
            await ScheduleWorkflowAsync(workflow);
        }
    }

    public async Task ScheduleWorkflowAsync(Workflow workflow)
    {
        if (_scheduler == null)
        {
            _scheduler = await _schedulerFactory.GetScheduler();
        }

        var jobKey = new JobKey($"workflow_{workflow.Id}", "workflows");
        var triggerKey = new TriggerKey($"trigger_{workflow.Id}", "workflows");

        // Remove existing if present
        if (await _scheduler.CheckExists(jobKey))
        {
            await _scheduler.DeleteJob(jobKey);
        }

        if (!workflow.IsActive || string.IsNullOrWhiteSpace(workflow.CronExpression))
        {
            return;
        }

        try
        {
            // Normalize standard 5-part cron to Quartz 6/7-part cron if needed
            string cron = NormalizeCron(workflow.CronExpression);

            var job = JobBuilder.Create<WorkflowJob>()
                .WithIdentity(jobKey)
                .UsingJobData("WorkflowId", workflow.Id.ToString())
                .Build();

            var trigger = TriggerBuilder.Create()
                .WithIdentity(triggerKey)
                .WithCronSchedule(cron, x => x.WithMisfireHandlingInstructionDoNothing())
                .Build();

            await _scheduler.ScheduleJob(job, trigger);
            _logger.LogInformation("Scheduled workflow '{WorkflowName}' ({WorkflowId}) with cron '{Cron}'",
                workflow.Name, workflow.Id, cron);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to schedule workflow '{WorkflowName}' with expression '{CronExpression}'",
                workflow.Name, workflow.CronExpression);
        }
    }

    public async Task UnscheduleWorkflowAsync(Guid workflowId)
    {
        if (_scheduler == null) return;
        var jobKey = new JobKey($"workflow_{workflowId}", "workflows");
        if (await _scheduler.CheckExists(jobKey))
        {
            await _scheduler.DeleteJob(jobKey);
            _logger.LogInformation("Unscheduled workflow {WorkflowId}", workflowId);
        }
    }

    private static string NormalizeCron(string cron)
    {
        var parts = cron.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        // If standard 5-part UNIX cron ("0 2 * * *"), convert to Quartz 6-part ("0 0 2 * * ?")
        if (parts.Length == 5)
        {
            string min = parts[0];
            string hour = parts[1];
            string dayOfMonth = parts[2];
            string month = parts[3];
            string dayOfWeek = parts[4];

            if (dayOfWeek == "*" && dayOfMonth != "*")
            {
                dayOfWeek = "?";
            }
            else if (dayOfMonth == "*")
            {
                dayOfMonth = "?";
            }

            return $"0 {min} {hour} {dayOfMonth} {month} {dayOfWeek}";
        }

        return cron;
    }
}
