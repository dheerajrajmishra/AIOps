using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InfraSentinel.Api.Core.Models;

[Table("Workflows")]
public class Workflow
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? CronExpression { get; set; } = "0 2 * * *";

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();

    public ICollection<WorkflowRun> Runs { get; set; } = new List<WorkflowRun>();
}
