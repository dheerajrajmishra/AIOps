using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InfraSentinel.Api.Core.Models;

[Table("WorkflowRuns")]
public class WorkflowRun
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WorkflowId { get; set; }

    [ForeignKey(nameof(WorkflowId))]
    public Workflow? Workflow { get; set; }

    [Required]
    [MaxLength(50)]
    public string TriggerType { get; set; } = "MANUAL"; // "SCHEDULED" | "MANUAL"

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "PENDING"; // "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? CompletedAt { get; set; }

    public int TotalSteps { get; set; } = 0;

    public int FailedSteps { get; set; } = 0;

    public ICollection<StepExecutionLog> ExecutionLogs { get; set; } = new List<StepExecutionLog>();
}
