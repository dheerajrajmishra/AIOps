using System.Diagnostics;
using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;

namespace InfraSentinel.Api.Infrastructure.Tools;

public class ServiceActionTool : IToolExecutor
{
    private readonly ILogger<ServiceActionTool> _logger;

    public ServiceActionTool(ILogger<ServiceActionTool> logger)
    {
        _logger = logger;
    }

    public string ToolType => "SERVICE_ACTION";

    public async Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context)
    {
        _logger.LogInformation("Executing SERVICE_ACTION for step {StepKey}", context.StepKey);

        string serviceName = "MSSQL$SQLEXPRESS";
        string action = "CHECK"; // "CHECK", "START", "RESTART"

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("serviceName", out var snProp) && snProp.GetString() is { } sn && !string.IsNullOrWhiteSpace(sn))
            {
                serviceName = sn;
            }
            if (context.Parameters.TryGetProperty("action", out var actProp) && actProp.GetString() is { } act && !string.IsNullOrWhiteSpace(act))
            {
                action = act.ToUpperInvariant();
            }
        }

        var sw = Stopwatch.StartNew();

        try
        {
            // Use PowerShell to query service state
            string command = action switch
            {
                "RESTART" => $"Restart-Service -Name '{serviceName}' -Force -ErrorAction Stop; Get-Service -Name '{serviceName}' | Select-Object Name, Status, StartType, DisplayName | ConvertTo-Json",
                "START" => $"Start-Service -Name '{serviceName}' -ErrorAction Stop; Get-Service -Name '{serviceName}' | Select-Object Name, Status, StartType, DisplayName | ConvertTo-Json",
                _ => $"Get-Service -Name '{serviceName}' -ErrorAction Stop | Select-Object Name, Status, StartType, DisplayName | ConvertTo-Json"
            };

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -NonInteractive -Command \"{command}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = psi };
            process.Start();

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            var timeoutTask = Task.Delay(10000, context.CancellationToken);
            var completed = await Task.WhenAny(Task.WhenAll(stdoutTask, stderrTask), timeoutTask);

            if (completed == timeoutTask)
            {
                try { process.Kill(); } catch { }
                return new ToolExecutionResult(
                    Status: "ERROR",
                    MetricValue: "Service Action Timeout",
                    ErrorMessage: $"PowerShell execution timed out after 10s for service '{serviceName}'"
                );
            }

            string stdout = await stdoutTask;
            string stderr = await stderrTask;
            sw.Stop();

            if (process.ExitCode != 0 || !string.IsNullOrWhiteSpace(stderr))
            {
                // If service not found or permission issue
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"Service Check Error",
                    RawOutput: stdout,
                    ErrorMessage: string.IsNullOrWhiteSpace(stderr) ? $"Process exited with code {process.ExitCode}" : stderr.Trim()
                );
            }

            // Parse json output
            bool isRunning = stdout.Contains("\"Status\": 4") || stdout.Contains("\"Status\": \"Running\"");
            string statusStr = isRunning ? "Running" : "Stopped";

            var outputJson = JsonSerializer.Serialize(new
            {
                serviceName,
                action,
                status = statusStr,
                latencyMs = sw.ElapsedMilliseconds,
                psOutput = stdout.Trim()
            }, new JsonSerializerOptions { WriteIndented = true });

            if (isRunning)
            {
                return new ToolExecutionResult(
                    Status: "PASS",
                    MetricValue: $"Service '{serviceName}' is {statusStr}",
                    RawOutput: outputJson
                );
            }
            else
            {
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"Service '{serviceName}' is {statusStr}",
                    RawOutput: outputJson,
                    ErrorMessage: $"Windows Service '{serviceName}' is not running (Current State: {statusStr})"
                );
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: "Service Check Exception",
                RawOutput: ex.ToString(),
                ErrorMessage: ex.Message
            );
        }
    }
}
