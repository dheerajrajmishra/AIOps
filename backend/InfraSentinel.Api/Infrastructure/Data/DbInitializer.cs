using InfraSentinel.Api.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace InfraSentinel.Api.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(InfraSentinelDbContext context, ILogger logger)
    {
        try
        {
            await context.Database.EnsureCreatedAsync();

            if (await context.Workflows.AnyAsync())
            {
                logger.LogInformation("Database already contains workflows. Skipping initialization.");
                return;
            }

            await SeedDemoWorkflowsAsync(context, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing database.");
            throw;
        }
    }

    public static async Task ResetAndSeedAsync(InfraSentinelDbContext context, ILogger logger)
    {
        try
        {
            await context.Database.EnsureCreatedAsync();

            logger.LogInformation("Clearing existing workflows, runs, and execution logs from database...");

            context.StepExecutionLogs.RemoveRange(context.StepExecutionLogs);
            context.WorkflowRuns.RemoveRange(context.WorkflowRuns);
            context.WorkflowSteps.RemoveRange(context.WorkflowSteps);
            context.Workflows.RemoveRange(context.Workflows);
            await context.SaveChangesAsync();

            logger.LogInformation("All existing workflows deleted. Inserting 6 demo workflows into database...");
            await SeedDemoWorkflowsAsync(context, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during ResetAndSeedAsync.");
            throw;
        }
    }

    private static async Task SeedDemoWorkflowsAsync(InfraSentinelDbContext context, ILogger logger)
    {
        var now = DateTimeOffset.UtcNow;

        // =========================================================================
        // 1. Workflow: Nightly Storage Capacity & PIC Escalation
        // =========================================================================
        var wf1Id = Guid.NewGuid();
        var wf1 = new Workflow
        {
            Id = wf1Id,
            Name = "Nightly Storage Capacity & PIC Escalation",
            Description = "Automated audit of database and application drive volumes with voice telephony escalation to on-call SRE on low free space thresholds.",
            CronExpression = "0 2 * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-10),
            UpdatedAt = now.AddDays(-10),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf1Id,
                    StepKey = "step_disk_check_db",
                    ToolType = "DISK_CHECK",
                    TargetHost = "SRV-DB-PROD-01",
                    ParametersJson = "{\"drive\": \"C:\", \"thresholdPercentFree\": 15}",
                    OnSuccessStepKey = "step_disk_check_app",
                    OnFailureStepKey = "step_voice_pic_storage",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf1Id,
                    StepKey = "step_voice_pic_storage",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"Lead On-Call SRE\", \"message\": \"Critical Alert: Low disk capacity detected on DB cluster volume C:.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "step_disk_check_app",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf1Id,
                    StepKey = "step_disk_check_app",
                    ToolType = "DISK_CHECK",
                    TargetHost = "SRV-APP-PROD-01",
                    ParametersJson = "{\"drive\": \"D:\", \"thresholdPercentFree\": 10}",
                    OnSuccessStepKey = "step_clean_temp_service",
                    OnFailureStepKey = "step_voice_pic_storage",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf1Id,
                    StepKey = "step_clean_temp_service",
                    ToolType = "SERVICE_ACTION",
                    TargetHost = "SRV-APP-PROD-01",
                    ParametersJson = "{\"serviceName\": \"W32Time\", \"action\": \"STATUS\"}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 20,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 440
                }
            }
        };

        // =========================================================================
        // 2. Workflow: SQL Server Production Cluster & Job Sentinel
        // =========================================================================
        var wf2Id = Guid.NewGuid();
        var wf2 = new Workflow
        {
            Id = wf2Id,
            Name = "SQL Server Production Cluster & Job Sentinel",
            Description = "Audits SQL Server high-availability availability group, queries database operational states, and verifies scheduled maintenance backup jobs.",
            CronExpression = "30 */3 * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-8),
            UpdatedAt = now.AddDays(-8),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf2Id,
                    StepKey = "step_sql_master_conn",
                    ToolType = "SQL_JOB_CHECK",
                    TargetHost = "localhost\\SQLEXPRESS",
                    ParametersJson = "{\"databaseName\": \"master\", \"query\": \"SELECT state_desc FROM sys.databases WHERE name = 'master'\"}",
                    OnSuccessStepKey = "step_sql_backup_job",
                    OnFailureStepKey = "step_dba_telephony_call",
                    TimeoutSeconds = 20,
                    RetryCount = 1,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf2Id,
                    StepKey = "step_dba_telephony_call",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"Principal DBA\", \"message\": \"Priority Alert: SQL Server instance connectivity failure on master cluster.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "step_sql_backup_job",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf2Id,
                    StepKey = "step_sql_backup_job",
                    ToolType = "SQL_JOB_CHECK",
                    TargetHost = "localhost\\SQLEXPRESS",
                    ParametersJson = "{\"databaseName\": \"msdb\", \"jobName\": \"Nightly_Backup\"}",
                    OnSuccessStepKey = "step_sql_service_verify",
                    OnFailureStepKey = "step_dba_telephony_call",
                    TimeoutSeconds = 25,
                    RetryCount = 2,
                    PositionX = 480,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf2Id,
                    StepKey = "step_sql_service_verify",
                    ToolType = "SERVICE_ACTION",
                    TargetHost = "SRV-DB-PROD-01",
                    ParametersJson = "{\"serviceName\": \"MSSQL$SQLEXPRESS\", \"action\": \"STATUS\"}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 440
                }
            }
        };

        // =========================================================================
        // 3. Workflow: Perimeter Gateway & RDP Security Audit
        // =========================================================================
        var wf3Id = Guid.NewGuid();
        var wf3 = new Workflow
        {
            Id = wf3Id,
            Name = "Perimeter Gateway & RDP Security Audit",
            Description = "Executes rapid TCP 3389 socket handshakes to verify perimeter bastion accessibility and edge ingress firewall responsiveness.",
            CronExpression = "0 */4 * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-6),
            UpdatedAt = now.AddDays(-6),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf3Id,
                    StepKey = "step_rdp_bastion_check",
                    ToolType = "RDP_PORT_CHECK",
                    TargetHost = "127.0.0.1",
                    ParametersJson = "{\"port\": 3389, \"timeoutMs\": 3000}",
                    OnSuccessStepKey = "step_public_edge_probe",
                    OnFailureStepKey = "step_secops_voice_alert",
                    TimeoutSeconds = 10,
                    RetryCount = 2,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf3Id,
                    StepKey = "step_secops_voice_alert",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"SecOps Lead\", \"message\": \"Security Notice: Perimeter RDP Handshake failed on ingress router.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "step_public_edge_probe",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf3Id,
                    StepKey = "step_public_edge_probe",
                    ToolType = "URL_CHECK_EXT",
                    TargetHost = "https://api.github.com",
                    ParametersJson = "{\"url\": \"https://api.github.com\", \"expectedStatusCode\": 200, \"maxLatencyMs\": 1500}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "step_secops_voice_alert",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 260
                }
            }
        };

        // =========================================================================
        // 4. Workflow: Public API Gateway & Edge Latency Monitor
        // =========================================================================
        var wf4Id = Guid.NewGuid();
        var wf4 = new Workflow
        {
            Id = wf4Id,
            Name = "Public API Gateway & Edge Latency Monitor",
            Description = "Probes customer-facing edge API gateways with TLS 1.3 verification, measuring round-trip latency and validating HTTPS status codes.",
            CronExpression = "*/15 * * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-4),
            UpdatedAt = now.AddDays(-4),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf4Id,
                    StepKey = "step_public_api_health",
                    ToolType = "URL_CHECK_EXT",
                    TargetHost = "https://api.github.com",
                    ParametersJson = "{\"url\": \"https://api.github.com\", \"expectedStatusCode\": 200, \"maxLatencyMs\": 2000}",
                    OnSuccessStepKey = "step_intranet_mesh_health",
                    OnFailureStepKey = "step_edge_voice_escalation",
                    TimeoutSeconds = 15,
                    RetryCount = 2,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf4Id,
                    StepKey = "step_edge_voice_escalation",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"Edge Network SRE\", \"message\": \"High Severity: Edge API gateway latency exceeded 2000ms SLA threshold.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "step_intranet_mesh_health",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf4Id,
                    StepKey = "step_intranet_mesh_health",
                    ToolType = "URL_CHECK_INT",
                    TargetHost = "http://localhost:5000/api/noc/matrix",
                    ParametersJson = "{\"url\": \"http://localhost:5000/api/noc/matrix\", \"expectedStatusCode\": 200, \"maxLatencyMs\": 800}",
                    OnSuccessStepKey = "step_web_service_status",
                    OnFailureStepKey = "step_edge_voice_escalation",
                    TimeoutSeconds = 10,
                    RetryCount = 2,
                    PositionX = 480,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf4Id,
                    StepKey = "step_web_service_status",
                    ToolType = "SERVICE_ACTION",
                    TargetHost = "SRV-APP-PROD-01",
                    ParametersJson = "{\"serviceName\": \"W32Time\", \"action\": \"STATUS\"}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 440
                }
            }
        };

        // =========================================================================
        // 5. Workflow: Core Banking & Payment Mesh Self-Healing
        // =========================================================================
        var wf5Id = Guid.NewGuid();
        var wf5 = new Workflow
        {
            Id = wf5Id,
            Name = "Core Banking & Payment Mesh Self-Healing",
            Description = "Inspects internal payment processing microservices, checks critical daemon services, and triggers self-healing restarts on failures.",
            CronExpression = "*/30 * * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-3),
            UpdatedAt = now.AddDays(-3),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf5Id,
                    StepKey = "step_payment_internal_check",
                    ToolType = "URL_CHECK_INT",
                    TargetHost = "http://localhost:5000/api/noc/matrix",
                    ParametersJson = "{\"url\": \"http://localhost:5000/api/noc/matrix\", \"expectedStatusCode\": 200, \"maxLatencyMs\": 500}",
                    OnSuccessStepKey = "step_payment_db_verify",
                    OnFailureStepKey = "step_service_remediation_daemon",
                    TimeoutSeconds = 10,
                    RetryCount = 2,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf5Id,
                    StepKey = "step_service_remediation_daemon",
                    ToolType = "SERVICE_ACTION",
                    TargetHost = "localhost",
                    ParametersJson = "{\"serviceName\": \"W32Time\", \"action\": \"STATUS\"}",
                    OnSuccessStepKey = "step_payment_db_verify",
                    OnFailureStepKey = "step_emergency_banking_pic",
                    TimeoutSeconds = 25,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf5Id,
                    StepKey = "step_emergency_banking_pic",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"FinOps Incident Commander\", \"message\": \"Critical Alert: Core payment daemon stopped and remediation failed.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 440
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf5Id,
                    StepKey = "step_payment_db_verify",
                    ToolType = "SQL_JOB_CHECK",
                    TargetHost = "localhost\\SQLEXPRESS",
                    ParametersJson = "{\"databaseName\": \"master\", \"query\": \"SELECT 1\"}",
                    OnSuccessStepKey = "step_payment_disk_capacity",
                    OnFailureStepKey = "step_emergency_banking_pic",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf5Id,
                    StepKey = "step_payment_disk_capacity",
                    ToolType = "DISK_CHECK",
                    TargetHost = "SRV-DB-PROD-01",
                    ParametersJson = "{\"drive\": \"C:\", \"thresholdPercentFree\": 12}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "step_emergency_banking_pic",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 440
                }
            }
        };

        // =========================================================================
        // 6. Workflow: Disaster Recovery & Replication Sentinel
        // =========================================================================
        var wf6Id = Guid.NewGuid();
        var wf6 = new Workflow
        {
            Id = wf6Id,
            Name = "Disaster Recovery & Replication Sentinel",
            Description = "Verifies secondary replica database synchronization, audits database cluster consistency, and tests backup volume write capacity.",
            CronExpression = "0 4 * * *",
            IsActive = true,
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now.AddDays(-2),
            Steps = new List<WorkflowStep>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf6Id,
                    StepKey = "step_dr_sql_replica_audit",
                    ToolType = "SQL_JOB_CHECK",
                    TargetHost = "localhost\\SQLEXPRESS",
                    ParametersJson = "{\"databaseName\": \"master\", \"jobName\": \"Nightly_Backup\"}",
                    OnSuccessStepKey = "step_dr_san_disk_check",
                    OnFailureStepKey = "step_dr_voice_escalation",
                    TimeoutSeconds = 20,
                    RetryCount = 1,
                    PositionX = 280,
                    PositionY = 80
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf6Id,
                    StepKey = "step_dr_voice_escalation",
                    ToolType = "VOICE_CALL_ACTION",
                    TargetHost = "+15550192834",
                    ParametersJson = "{\"recipientPhone\": \"+15550192834\", \"picName\": \"Disaster Recovery Lead\", \"message\": \"Disaster Recovery Warning: SQL secondary replica synchronization latency exceeded.\", \"provider\": \"Twilio\"}",
                    OnSuccessStepKey = "step_dr_san_disk_check",
                    OnFailureStepKey = "END",
                    TimeoutSeconds = 30,
                    RetryCount = 1,
                    PositionX = 80,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf6Id,
                    StepKey = "step_dr_san_disk_check",
                    ToolType = "DISK_CHECK",
                    TargetHost = "SRV-BACKUP-01",
                    ParametersJson = "{\"drive\": \"C:\", \"thresholdPercentFree\": 20}",
                    OnSuccessStepKey = "step_dr_gateway_ping",
                    OnFailureStepKey = "step_dr_voice_escalation",
                    TimeoutSeconds = 15,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 260
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wf6Id,
                    StepKey = "step_dr_gateway_ping",
                    ToolType = "RDP_PORT_CHECK",
                    TargetHost = "127.0.0.1",
                    ParametersJson = "{\"port\": 3389, \"timeoutMs\": 2500}",
                    OnSuccessStepKey = "END",
                    OnFailureStepKey = "step_dr_voice_escalation",
                    TimeoutSeconds = 10,
                    RetryCount = 1,
                    PositionX = 480,
                    PositionY = 440
                }
            }
        };

        context.Workflows.AddRange(wf1, wf2, wf3, wf4, wf5, wf6);
        await context.SaveChangesAsync();

        // =========================================================================
        // Historical Runs & Telemetry Logs for each workflow (7 runs per workflow)
        // =========================================================================
        var allWfs = new[] { wf1, wf2, wf3, wf4, wf5, wf6 };
        for (int i = 0; i < allWfs.Length; i++)
        {
            var targetWf = allWfs[i];
            for (int r = 0; r < 7; r++)
            {
                // r = 0 is latest, r = 6 is oldest
                var runTime = now.AddMinutes(-1 * ((r * 35) + 4));
                var runId = Guid.NewGuid();

                // Failure distribution across the 7 runs:
                // - Wf 0 (Storage): run 0 & run 3 failed (Drive C: disk full)
                // - Wf 2 (Perimeter): run 2 failed (RDP port closed)
                // - Wf 4 (Core Banking): run 0 & run 5 failed (HTTP 503 internal timeout)
                // - Wf 1, 3, 5: all passing
                bool hasFailure = false;
                if (i == 0 && (r == 0 || r == 3)) hasFailure = true;
                if (i == 2 && r == 2) hasFailure = true;
                if (i == 4 && (r == 0 || r == 5)) hasFailure = true;

                var run = new WorkflowRun
                {
                    Id = runId,
                    WorkflowId = targetWf.Id,
                    TriggerType = (r % 3 == 1) ? "MANUAL" : "SCHEDULED",
                    Status = hasFailure ? "FAILED" : "COMPLETED",
                    StartedAt = runTime,
                    CompletedAt = runTime.AddSeconds(12 + (r * 2)),
                    TotalSteps = targetWf.Steps.Count,
                    FailedSteps = hasFailure ? 1 : 0
                };
                context.WorkflowRuns.Add(run);

                // Add step logs for this run
                foreach (var step in targetWf.Steps)
                {
                    bool stepFailed = hasFailure && (
                        (step.ToolType == "DISK_CHECK" && step.StepKey == "step_disk_check_db") ||
                        (step.ToolType == "RDP_PORT_CHECK" && step.StepKey == "step_rdp_port_audit") ||
                        (step.ToolType == "URL_CHECK_INT" && step.StepKey == "step_payment_internal_check")
                    );

                    string metric = step.ToolType switch
                    {
                        "DISK_CHECK" => stepFailed ? "4.8% Free (23 GB / 458 GB)" : "28.5% Free (130 GB / 458 GB)",
                        "RDP_PORT_CHECK" => stepFailed ? "Port 3389 CLOSED (Connection Refused)" : "Port 3389 OPEN (14ms)",
                        "SQL_JOB_CHECK" => "SQL Online: DB 'master' HEALTHY (16ms)",
                        "URL_CHECK_EXT" => "HTTPS 200 OK (74ms)",
                        "URL_CHECK_INT" => stepFailed ? "HTTP 503 Service Unavailable (Socket Timeout)" : "HTTP 200 OK (18ms)",
                        "SERVICE_ACTION" => "Service 'W32Time' RUNNING (PID 1420)",
                        "VOICE_CALL_ACTION" => "Telephony Alert Dispatched -> PIC (Twilio SID: CA9b8c2...)",
                        _ => "OK (10ms)"
                    };

                    string? errorMsg = stepFailed switch
                    {
                        true when step.ToolType == "DISK_CHECK" => "Free disk space 4.8% is below critical threshold 15%",
                        true when step.ToolType == "RDP_PORT_CHECK" => "Port 3389 unreachable on host perimeter-gw-prod-01 (Connection Refused)",
                        true when step.ToolType == "URL_CHECK_INT" => "Service internal endpoint returned HTTP 503 timeout after 3000ms",
                        _ => null
                    };

                    context.StepExecutionLogs.Add(new StepExecutionLog
                    {
                        Id = Guid.NewGuid(),
                        RunId = runId,
                        StepKey = step.StepKey,
                        TargetHost = step.TargetHost,
                        CheckType = step.ToolType,
                        Status = stepFailed ? "FAIL" : "PASS",
                        MetricValue = metric,
                        RawOutput = "{\"status\": \"" + (stepFailed ? "FAIL" : "PASS") + "\", \"timestamp\": \"" + runTime.ToString("o") + "\"}",
                        ErrorMessage = errorMsg,
                        DurationMs = step.ToolType == "VOICE_CALL_ACTION" ? 850 : 120 + (r * 15),
                        ExecutedAt = runTime.AddSeconds(2)
                    });
                }
            }
        }

        await context.SaveChangesAsync();
        logger.LogInformation("Database seeded with 6 demo workflows, full steps, and telemetry logs.");
    }
}
