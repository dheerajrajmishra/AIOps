using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InfraSentinel.Api.Core.Models;

[Table("WorkflowSteps")]
public class WorkflowStep
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WorkflowId { get; set; }

    [ForeignKey(nameof(WorkflowId))]
    public Workflow? Workflow { get; set; }

    [Required]
    [MaxLength(100)]
    public string StepKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ToolType { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? TargetHost { get; set; }

    public string ParametersJson { get; set; } = "{}";

    [MaxLength(100)]
    public string? OnSuccessStepKey { get; set; }

    [MaxLength(100)]
    public string? OnFailureStepKey { get; set; }

    public int TimeoutSeconds { get; set; } = 30;

    public int RetryCount { get; set; } = 1;

    // Canvas layout coordinates for visual DAG editor
    public double PositionX { get; set; } = 250;

    public double PositionY { get; set; } = 100;
}
