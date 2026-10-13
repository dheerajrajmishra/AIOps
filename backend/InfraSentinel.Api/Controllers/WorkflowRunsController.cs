using InfraSentinel.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InfraSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowRunsController : ControllerBase
{
    private readonly InfraSentinelDbContext _dbContext;

    public WorkflowRunsController(InfraSentinelDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRuns([FromQuery] int limit = 50, [FromQuery] Guid? workflowId = null)
    {
        var query = _dbContext.WorkflowRuns
            .Include(r => r.Workflow)
            .AsQueryable();

        if (workflowId.HasValue)
        {
            query = query.Where(r => r.WorkflowId == workflowId.Value);
        }

        var runs = await query
            .OrderByDescending(r => r.StartedAt)
            .Take(limit)
            .Select(r => new
            {
                r.Id,
                r.WorkflowId,
                WorkflowName = r.Workflow != null ? r.Workflow.Name : "Unknown",
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

        return Ok(runs);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRunById(Guid id)
    {
        var run = await _dbContext.WorkflowRuns
            .Include(r => r.Workflow)
            .Include(r => r.ExecutionLogs.OrderBy(l => l.ExecutedAt))
            .FirstOrDefaultAsync(r => r.Id == id);

        if (run == null) return NotFound(new { message = $"Run {id} not found" });

        return Ok(new
        {
            run.Id,
            run.WorkflowId,
            WorkflowName = run.Workflow?.Name,
            run.TriggerType,
            run.Status,
            run.StartedAt,
            run.CompletedAt,
            run.TotalSteps,
            run.FailedSteps,
            DurationMs = run.CompletedAt.HasValue ? (long)(run.CompletedAt.Value - run.StartedAt).TotalMilliseconds : 0,
            Logs = run.ExecutionLogs.Select(l => new
            {
                l.Id,
                l.StepKey,
                l.TargetHost,
                l.CheckType,
                l.Status,
                l.MetricValue,
                l.RawOutput,
                l.ErrorMessage,
                l.DurationMs,
                l.ExecutedAt
            })
        });
    }

    [HttpGet("{id}/logs")]
    public async Task<IActionResult> GetRunLogs(Guid id)
    {
        var logs = await _dbContext.StepExecutionLogs
            .Where(l => l.RunId == id)
            .OrderBy(l => l.ExecutedAt)
            .ToListAsync();

        return Ok(logs);
    }
}
