using System.Diagnostics;
using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;
using InfraSentinel.Api.Core.Models;
using InfraSentinel.Api.Hubs;
using InfraSentinel.Api.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace InfraSentinel.Api.Engine;

public class DagExecutionEngine : IDagExecutionEngine
{
    private readonly ILogger<DagExecutionEngine> _logger;
    private readonly InfraSentinelDbContext _dbContext;
    private readonly IEnumerable<IToolExecutor> _toolExecutors;
    private readonly IHubContext<ExecutionStreamHub, IExecutionStreamClient> _hubContext;

    public DagExecutionEngine(
        ILogger<DagExecutionEngine> logger,
        InfraSentinelDbContext dbContext,
        IEnumerable<IToolExecutor> toolExecutors,
        IHubContext<ExecutionStreamHub, IExecutionStreamClient> hubContext)
    {
        _logger = logger;
        _dbContext = dbContext;
        _toolExecutors = toolExecutors;
        _hubContext = hubContext;
    }

    public async Task<WorkflowRun> ExecuteWorkflowAsync(Guid workflowId, string triggerType = "MANUAL", CancellationToken cancellationToken = default)
    {
        var workflow = await _dbContext.Workflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);

        if (workflow == null)
        {
            throw new ArgumentException($"Workflow with ID {workflowId} does not exist.");
        }

        var run = new WorkflowRun
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            TriggerType = triggerType,
            Status = "RUNNING",
            StartedAt = DateTimeOffset.UtcNow,
            TotalSteps = 0,
            FailedSteps = 0
        };

        _dbContext.WorkflowRuns.Add(run);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var runGroup = $"run_{run.Id}";
        await BroadcastLogAsync(run.Id, "INFO", $"[ENGINE] Started workflow '{workflow.Name}' (RunId: {run.Id}, Trigger: {triggerType})");
        await _hubContext.Clients.Group("global_noc").ReceiveRunStatusChanged(run.Id, "RUNNING", 0, 0);

        var steps = workflow.Steps.ToList();
        if (steps.Count == 0)
        {
            run.Status = "COMPLETED";
            run.CompletedAt = DateTimeOffset.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await BroadcastLogAsync(run.Id, "WARN", "[ENGINE] Workflow contains no steps. Concluded.");
            return run;
        }

        // Identify Root Step: A step that is not pointed to by any other step's OnSuccess or OnFailure
        var pointedSteps = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var s in steps)
        {
            if (!string.IsNullOrWhiteSpace(s.OnSuccessStepKey)) pointedSteps.Add(s.OnSuccessStepKey);
            if (!string.IsNullOrWhiteSpace(s.OnFailureStepKey)) pointedSteps.Add(s.OnFailureStepKey);
        }

        var rootStep = steps.FirstOrDefault(s => !pointedSteps.Contains(s.StepKey)) ?? steps.First();
        var stepDict = steps.ToDictionary(s => s.StepKey, StringComparer.OrdinalIgnoreCase);

        var visitedStepKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var currentStep = rootStep;
        int executedStepsCount = 0;
        int failedStepsCount = 0;
        var runStopwatch = Stopwatch.StartNew();

        while (currentStep != null && !cancellationToken.IsCancellationRequested)
        {
            // Circular dependency safeguard
            if (visitedStepKeys.Contains(currentStep.StepKey))
            {
                await BroadcastLogAsync(run.Id, "WARN", $"[ENGINE] Circular reference detected at step '{currentStep.StepKey}'. Terminating branch.");
                break;
            }
            if (executedStepsCount >= 50)
            {
                await BroadcastLogAsync(run.Id, "WARN", "[ENGINE] Step execution ceiling reached (50 steps max). Concluding run.");
                break;
            }

            visitedStepKeys.Add(currentStep.StepKey);
            executedStepsCount++;

            // 1. Notify Step Started
            await _hubContext.Clients.Group(runGroup).ReceiveStepStarted(run.Id, currentStep.StepKey, currentStep.ToolType, currentStep.TargetHost);
            await _hubContext.Clients.Group("global_noc").ReceiveStepStarted(run.Id, currentStep.StepKey, currentStep.ToolType, currentStep.TargetHost);
            await BroadcastLogAsync(run.Id, "INFO", $"[DISPATCH] [{currentStep.StepKey}] Tool: {currentStep.ToolType} | Target: {currentStep.TargetHost ?? "localhost"}");

            // 2. Resolve Tool Executor
            var executor = _toolExecutors.FirstOrDefault(e => e.ToolType.Equals(currentStep.ToolType, StringComparison.OrdinalIgnoreCase));
            ToolExecutionResult result;
            var stepSw = Stopwatch.StartNew();

            if (executor == null)
            {
                stepSw.Stop();
                result = new ToolExecutionResult(
                    Status: "ERROR",
                    MetricValue: "Executor Missing",
                    ErrorMessage: $"No registered executor for tool type '{currentStep.ToolType}'"
                );
            }
            else
            {
                // Parse parameters
                JsonElement parametersJson;
                try
                {
                    using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(currentStep.ParametersJson) ? "{}" : currentStep.ParametersJson);
                    parametersJson = doc.RootElement.Clone();
                }
                catch
                {
                    using var doc = JsonDocument.Parse("{}");
                    parametersJson = doc.RootElement.Clone();
                }

                // Execute with retries & timeout
                int attempts = Math.Max(1, currentStep.RetryCount);
                ToolExecutionResult lastResult = null!;

                for (int attempt = 1; attempt <= attempts; attempt++)
                {
                    if (attempt > 1)
                    {
                        await BroadcastLogAsync(run.Id, "WARN", $"[RETRY] [{currentStep.StepKey}] Retrying execution (Attempt {attempt}/{attempts})...");
                        await Task.Delay(1000, cancellationToken);
                    }

                    try
                    {
                        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(5, currentStep.TimeoutSeconds)));
                        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

                        var execContext = new ToolExecutionContext(
                            RunId: run.Id,
                            StepKey: currentStep.StepKey,
                            TargetHost: currentStep.TargetHost,
                            Parameters: parametersJson,
                            CancellationToken: linkedCts.Token
                        );

                        lastResult = await executor.ExecuteAsync(execContext);

                        if (lastResult.Status == "PASS")
                        {
                            break; // Success on this attempt
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        lastResult = new ToolExecutionResult(
                            Status: "FAIL",
                            MetricValue: "Execution Timeout",
                            ErrorMessage: $"Step execution timed out after {currentStep.TimeoutSeconds}s"
                        );
                    }
                    catch (Exception ex)
                    {
                        lastResult = new ToolExecutionResult(
                            Status: "ERROR",
                            MetricValue: "Execution Exception",
                            ErrorMessage: ex.Message,
                            RawOutput: ex.ToString()
                        );
                    }
                }

                stepSw.Stop();
                result = lastResult;
            }

            // 3. Save Step Log
            var stepLog = new StepExecutionLog
            {
                Id = Guid.NewGuid(),
                RunId = run.Id,
                StepKey = currentStep.StepKey,
                TargetHost = currentStep.TargetHost ?? Environment.MachineName,
                CheckType = currentStep.ToolType,
                Status = result.Status,
                MetricValue = result.MetricValue,
                RawOutput = result.RawOutput ?? string.Empty,
                ErrorMessage = result.ErrorMessage,
                DurationMs = stepSw.ElapsedMilliseconds,
                ExecutedAt = DateTimeOffset.UtcNow
            };

            _dbContext.StepExecutionLogs.Add(stepLog);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // 4. Notify Step Completed
            await _hubContext.Clients.Group(runGroup).ReceiveStepCompleted(
                run.Id, currentStep.StepKey, result.Status, result.MetricValue, stepSw.ElapsedMilliseconds, result.RawOutput, result.ErrorMessage);
            await _hubContext.Clients.Group("global_noc").ReceiveStepCompleted(
                run.Id, currentStep.StepKey, result.Status, result.MetricValue, stepSw.ElapsedMilliseconds, result.RawOutput, result.ErrorMessage);

            var logSeverity = result.Status == "PASS" ? "SUCCESS" : (result.Status == "FAIL" ? "ERROR" : "WARN");
            await BroadcastLogAsync(run.Id, logSeverity, $"[RESULT] [{currentStep.StepKey}] Status: {result.Status} | Metric: {result.MetricValue} ({stepSw.ElapsedMilliseconds}ms)");

            // 5. Branching Logic Decision
            if (result.Status == "PASS")
            {
                if (!string.IsNullOrWhiteSpace(currentStep.OnSuccessStepKey) &&
                    !currentStep.OnSuccessStepKey.Equals("END", StringComparison.OrdinalIgnoreCase) &&
                    !currentStep.OnSuccessStepKey.Equals("STOP", StringComparison.OrdinalIgnoreCase))
                {
                    if (stepDict.TryGetValue(currentStep.OnSuccessStepKey, out var nextStep))
                    {
                        await BroadcastLogAsync(run.Id, "INFO", $"[BRANCH] Step succeeded -> Transitioning to OnSuccess target: '{currentStep.OnSuccessStepKey}'");
                        currentStep = nextStep;
                    }
                    else
                    {
                        await BroadcastLogAsync(run.Id, "WARN", $"[BRANCH] Target OnSuccess step '{currentStep.OnSuccessStepKey}' not found. Concluding.");
                        currentStep = null;
                    }
                }
                else
                {
                    await BroadcastLogAsync(run.Id, "INFO", "[BRANCH] Step succeeded -> Terminal branch reached.");
                    currentStep = null;
                }
            }
            else // FAIL or ERROR
            {
                failedStepsCount++;
                if (!string.IsNullOrWhiteSpace(currentStep.OnFailureStepKey) &&
                    !currentStep.OnFailureStepKey.Equals("END", StringComparison.OrdinalIgnoreCase) &&
                    !currentStep.OnFailureStepKey.Equals("STOP", StringComparison.OrdinalIgnoreCase))
                {
                    if (stepDict.TryGetValue(currentStep.OnFailureStepKey, out var failStep))
                    {
                        await BroadcastLogAsync(run.Id, "WARN", $"[BRANCH] Step {result.Status} -> Diverting to OnFailure remediation: '{currentStep.OnFailureStepKey}'");
                        currentStep = failStep;
                    }
                    else
                    {
                        await BroadcastLogAsync(run.Id, "WARN", $"[BRANCH] Target OnFailure step '{currentStep.OnFailureStepKey}' not found. Concluding.");
                        currentStep = null;
                    }
                }
                else
                {
                    await BroadcastLogAsync(run.Id, "INFO", $"[BRANCH] Step {result.Status} -> Terminal failure branch reached.");
                    currentStep = null;
                }
            }
        }

        runStopwatch.Stop();
        run.TotalSteps = executedStepsCount;
        run.FailedSteps = failedStepsCount;
        run.Status = (failedStepsCount == 0) ? "COMPLETED" : "FAILED";
        run.CompletedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        // Notify Run Completed
        await _hubContext.Clients.Group(runGroup).ReceiveRunCompleted(run.Id, run.Status, executedStepsCount, failedStepsCount, runStopwatch.ElapsedMilliseconds);
        await _hubContext.Clients.Group("global_noc").ReceiveRunCompleted(run.Id, run.Status, executedStepsCount, failedStepsCount, runStopwatch.ElapsedMilliseconds);
        await BroadcastLogAsync(run.Id, run.Status == "COMPLETED" ? "SUCCESS" : "ERROR",
            $"[ENGINE] Workflow '{workflow.Name}' finished with status '{run.Status}' (Total Steps: {executedStepsCount}, Failures: {failedStepsCount}, Total Time: {runStopwatch.ElapsedMilliseconds}ms)");

        return run;
    }

    private async Task BroadcastLogAsync(Guid runId, string level, string message)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var runGroup = $"run_{runId}";
        await _hubContext.Clients.Group(runGroup).ReceiveConsoleLog(runId, timestamp, level, message);
        await _hubContext.Clients.Group("global_noc").ReceiveConsoleLog(runId, timestamp, level, message);
    }
}
