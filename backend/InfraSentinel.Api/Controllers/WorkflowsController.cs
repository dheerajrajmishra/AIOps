using InfraSentinel.Api.Core.Models;
using InfraSentinel.Api.Engine;
using InfraSentinel.Api.Infrastructure.Data;
using InfraSentinel.Api.Scheduling;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InfraSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowsController : ControllerBase
{
    private readonly InfraSentinelDbContext _dbContext;
    private readonly IDagExecutionEngine _dagEngine;
    private readonly IWorkflowSchedulerService _schedulerService;
    private readonly ILogger<WorkflowsController> _logger;

    public WorkflowsController(
        InfraSentinelDbContext dbContext,
        IDagExecutionEngine dagEngine,
        IWorkflowSchedulerService schedulerService,
        ILogger<WorkflowsController> logger)
    {
        _dbContext = dbContext;
        _dagEngine = dagEngine;
        _schedulerService = schedulerService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var workflows = await _dbContext.Workflows
            .Include(w => w.Steps)
            .OrderByDescending(w => w.UpdatedAt)
            .Select(w => new
            {
                w.Id,
                w.Name,
                w.Description,
                w.CronExpression,
                w.IsActive,
                w.CreatedAt,
                w.UpdatedAt,
                StepCount = w.Steps.Count,
                Steps = w.Steps.Select(s => new
                {
                    s.Id,
                    s.StepKey,
                    s.ToolType,
                    s.TargetHost,
                    s.ParametersJson,
                    s.OnSuccessStepKey,
                    s.OnFailureStepKey,
                    s.TimeoutSeconds,
                    s.RetryCount,
                    s.PositionX,
                    s.PositionY
                }).ToList(),
                LastRun = _dbContext.WorkflowRuns
                    .Where(r => r.WorkflowId == w.Id)
                    .OrderByDescending(r => r.StartedAt)
                    .Select(r => new
                    {
                        r.Id,
                        r.Status,
                        r.StartedAt,
                        r.CompletedAt,
                        r.FailedSteps,
                        r.TotalSteps,
                        r.TriggerType,
                        DurationMs = r.CompletedAt.HasValue
                            ? (long)(r.CompletedAt.Value - r.StartedAt).TotalMilliseconds
                            : 0
                    })
                    .FirstOrDefault(),
                RecentRuns = _dbContext.WorkflowRuns
                    .Where(r => r.WorkflowId == w.Id)
                    .OrderByDescending(r => r.StartedAt)
                    .Take(7)
                    .Select(r => new
                    {
                        r.Id,
                        r.Status,
                        r.StartedAt,
                        r.CompletedAt,
                        r.FailedSteps,
                        r.TotalSteps,
                        r.TriggerType,
                        DurationMs = r.CompletedAt.HasValue
                            ? (long)(r.CompletedAt.Value - r.StartedAt).TotalMilliseconds
                            : 0
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(workflows);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var workflow = await _dbContext.Workflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null) return NotFound(new { message = $"Workflow {id} not found" });

        var recentRuns = await _dbContext.WorkflowRuns
            .Where(r => r.WorkflowId == id)
            .OrderByDescending(r => r.StartedAt)
            .Take(10)
            .Select(r => new
            {
                r.Id,
                r.TriggerType,
                r.Status,
                r.StartedAt,
                r.CompletedAt,
                r.TotalSteps,
                r.FailedSteps,
                DurationMs = r.CompletedAt.HasValue
                    ? (long)(r.CompletedAt.Value - r.StartedAt).TotalMilliseconds
                    : 0
            })
            .ToListAsync();

        return Ok(new
        {
            workflow.Id,
            workflow.Name,
            workflow.Description,
            workflow.CronExpression,
            workflow.IsActive,
            workflow.CreatedAt,
            workflow.UpdatedAt,
            Steps = workflow.Steps.Select(s => new
            {
                s.Id,
                s.StepKey,
                s.ToolType,
                s.TargetHost,
                s.ParametersJson,
                s.OnSuccessStepKey,
                s.OnFailureStepKey,
                s.TimeoutSeconds,
                s.RetryCount,
                s.PositionX,
                s.PositionY
            }),
            RecentRuns = recentRuns
        });
    }

    public record SaveWorkflowDto(
        string Name,
        string? Description,
        string? CronExpression,
        bool IsActive,
        List<SaveStepDto> Steps
    );

    public record SaveStepDto(
        string StepKey,
        string ToolType,
        string? TargetHost,
        string ParametersJson,
        string? OnSuccessStepKey,
        string? OnFailureStepKey,
        int TimeoutSeconds,
        int RetryCount,
        double PositionX,
        double PositionY
    );

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveWorkflowDto dto)
    {
        var workflow = new Workflow
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            CronExpression = dto.CronExpression,
            IsActive = dto.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        foreach (var s in dto.Steps)
        {
            workflow.Steps.Add(new WorkflowStep
            {
                Id = Guid.NewGuid(),
                WorkflowId = workflow.Id,
                StepKey = s.StepKey,
                ToolType = s.ToolType,
                TargetHost = s.TargetHost,
                ParametersJson = s.ParametersJson,
                OnSuccessStepKey = s.OnSuccessStepKey,
                OnFailureStepKey = s.OnFailureStepKey,
                TimeoutSeconds = s.TimeoutSeconds > 0 ? s.TimeoutSeconds : 30,
                RetryCount = s.RetryCount >= 0 ? s.RetryCount : 1,
                PositionX = s.PositionX,
                PositionY = s.PositionY
            });
        }

        _dbContext.Workflows.Add(workflow);
        await _dbContext.SaveChangesAsync();

        await _schedulerService.ScheduleWorkflowAsync(workflow);

        return CreatedAtAction(nameof(GetById), new { id = workflow.Id }, workflow);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveWorkflowDto dto)
    {
        var workflow = await _dbContext.Workflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null) return NotFound(new { message = $"Workflow {id} not found" });

        workflow.Name = dto.Name;
        workflow.Description = dto.Description;
        workflow.CronExpression = dto.CronExpression;
        workflow.IsActive = dto.IsActive;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;

        // Replace steps
        _dbContext.WorkflowSteps.RemoveRange(workflow.Steps);
        workflow.Steps.Clear();

        foreach (var s in dto.Steps)
        {
            workflow.Steps.Add(new WorkflowStep
            {
                Id = Guid.NewGuid(),
                WorkflowId = workflow.Id,
                StepKey = s.StepKey,
                ToolType = s.ToolType,
                TargetHost = s.TargetHost,
                ParametersJson = s.ParametersJson,
                OnSuccessStepKey = s.OnSuccessStepKey,
                OnFailureStepKey = s.OnFailureStepKey,
                TimeoutSeconds = s.TimeoutSeconds > 0 ? s.TimeoutSeconds : 30,
                RetryCount = s.RetryCount >= 0 ? s.RetryCount : 1,
                PositionX = s.PositionX,
                PositionY = s.PositionY
            });
        }

        await _dbContext.SaveChangesAsync();
        await _schedulerService.ScheduleWorkflowAsync(workflow);

        return Ok(workflow);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var workflow = await _dbContext.Workflows.FindAsync(id);
        if (workflow == null) return NotFound();

        await _schedulerService.UnscheduleWorkflowAsync(id);
        _dbContext.Workflows.Remove(workflow);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/run")]
    public IActionResult TriggerManualRun(Guid id, [FromQuery] string triggerType = "MANUAL")
    {
        // Kick off execution in the background task and return immediately with accepted status
        _ = Task.Run(async () =>
        {
            try
            {
                await _dagEngine.ExecuteWorkflowAsync(id, triggerType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background run failed for workflow {WorkflowId}", id);
            }
        });

        return Accepted(new { message = "Workflow execution triggered successfully", workflowId = id });
    }

    [HttpPost("reset-demo")]
    public async Task<IActionResult> ResetDemoWorkflows()
    {
        await DbInitializer.ResetAndSeedAsync(_dbContext, _logger);
        return Ok(new { message = "6 Demo workflows reset and seeded successfully in database" });
    }
}
