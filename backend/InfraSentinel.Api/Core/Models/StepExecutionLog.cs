using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InfraSentinel.Api.Core.Models;

[Table("StepExecutionLogs")]
public class StepExecutionLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RunId { get; set; }

    [ForeignKey(nameof(RunId))]
    public WorkflowRun? Run { get; set; }

    [Required]
    [MaxLength(100)]
    public string StepKey { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? TargetHost { get; set; }

    [Required]
    [MaxLength(50)]
    public string CheckType { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PASS"; // "PASS" | "FAIL" | "ERROR"

    [Required]
    [MaxLength(255)]
    public string MetricValue { get; set; } = string.Empty;

    public string RawOutput { get; set; } = string.Empty;

    public string? ErrorMessage { get; set; }

    public long DurationMs { get; set; } = 0;

    public DateTimeOffset ExecutedAt { get; set; } = DateTimeOffset.UtcNow;
}
