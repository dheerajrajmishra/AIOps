using InfraSentinel.Api.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace InfraSentinel.Api.Infrastructure.Data;

public class InfraSentinelDbContext : DbContext
{
    public InfraSentinelDbContext(DbContextOptions<InfraSentinelDbContext> options)
        : base(options)
    {
    }

    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<WorkflowRun> WorkflowRuns => Set<WorkflowRun>();
    public DbSet<StepExecutionLog> StepExecutionLogs => Set<StepExecutionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Workflow configuration
        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Name).IsRequired().HasMaxLength(150);
            entity.Property(w => w.CronExpression).HasMaxLength(50);
            entity.Property(w => w.IsActive).HasDefaultValue(true);
            entity.HasMany(w => w.Steps)
                  .WithOne(s => s.Workflow)
                  .HasForeignKey(s => s.WorkflowId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(w => w.Runs)
                  .WithOne(r => r.Workflow)
                  .HasForeignKey(r => r.WorkflowId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // WorkflowStep configuration
        modelBuilder.Entity<WorkflowStep>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.StepKey).IsRequired().HasMaxLength(100);
            entity.Property(s => s.ToolType).IsRequired().HasMaxLength(50);
            entity.Property(s => s.TargetHost).HasMaxLength(200);
            entity.Property(s => s.OnSuccessStepKey).HasMaxLength(100);
            entity.Property(s => s.OnFailureStepKey).HasMaxLength(100);
            
            // Unique step key per workflow
            entity.HasIndex(s => new { s.WorkflowId, s.StepKey }).IsUnique();
        });

        // WorkflowRun configuration
        modelBuilder.Entity<WorkflowRun>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.TriggerType).IsRequired().HasMaxLength(50);
            entity.Property(r => r.Status).IsRequired().HasMaxLength(30);
            entity.HasIndex(r => new { r.WorkflowId, r.StartedAt });
            entity.HasMany(r => r.ExecutionLogs)
                  .WithOne(l => l.Run)
                  .HasForeignKey(l => l.RunId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // StepExecutionLog configuration
        modelBuilder.Entity<StepExecutionLog>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.StepKey).IsRequired().HasMaxLength(100);
            entity.Property(l => l.TargetHost).HasMaxLength(200);
            entity.Property(l => l.CheckType).IsRequired().HasMaxLength(50);
            entity.Property(l => l.Status).IsRequired().HasMaxLength(20);
            entity.Property(l => l.MetricValue).IsRequired().HasMaxLength(255);
            entity.HasIndex(l => l.RunId);
            entity.HasIndex(l => new { l.TargetHost, l.ExecutedAt });
        });
    }
}
