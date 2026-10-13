using System.Diagnostics;
using System.Net.Sockets;
using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;

namespace InfraSentinel.Api.Infrastructure.Tools;

public class RdpPortCheckTool : IToolExecutor
{
    private readonly ILogger<RdpPortCheckTool> _logger;

    public RdpPortCheckTool(ILogger<RdpPortCheckTool> logger)
    {
        _logger = logger;
    }

    public string ToolType => "RDP_PORT_CHECK";

    public async Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context)
    {
        _logger.LogInformation("Executing RDP_PORT_CHECK on {TargetHost} for run {RunId}", context.TargetHost, context.RunId);

        string host = context.TargetHost ?? "127.0.0.1";
        int port = 3389;
        int timeoutMs = 3000;

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("port", out var pProp) && pProp.TryGetInt32(out var p))
            {
                port = p;
            }
            if (context.Parameters.TryGetProperty("timeoutMs", out var toProp) && toProp.TryGetInt32(out var to))
            {
                timeoutMs = to;
            }
        }

        var sw = Stopwatch.StartNew();

        try
        {
            using var tcpClient = new TcpClient();
            var connectTask = tcpClient.ConnectAsync(host, port);
            var completedTask = await Task.WhenAny(connectTask, Task.Delay(timeoutMs, context.CancellationToken));

            sw.Stop();

            if (completedTask == connectTask && tcpClient.Connected)
            {
                var outputJson = JsonSerializer.Serialize(new
                {
                    targetHost = host,
                    port,
                    status = "CONNECTED",
                    latencyMs = sw.ElapsedMilliseconds,
                    protocol = "TCP Handshake / MS-RDP",
                    timeoutMs
                }, new JsonSerializerOptions { WriteIndented = true });

                return new ToolExecutionResult(
                    Status: "PASS",
                    MetricValue: $"Port {port} OPEN ({sw.ElapsedMilliseconds}ms)",
                    RawOutput: outputJson
                );
            }
            else
            {
                var outputJson = JsonSerializer.Serialize(new
                {
                    targetHost = host,
                    port,
                    status = "TIMEOUT_OR_REFUSED",
                    latencyMs = sw.ElapsedMilliseconds,
                    timeoutMs
                }, new JsonSerializerOptions { WriteIndented = true });

                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"Port {port} CLOSED/TIMEOUT ({sw.ElapsedMilliseconds}ms)",
                    RawOutput: outputJson,
                    ErrorMessage: $"Failed to establish TCP handshake to {host}:{port} within {timeoutMs}ms"
                );
            }
        }
        catch (SocketException sockEx)
        {
            sw.Stop();
            var outputJson = JsonSerializer.Serialize(new
            {
                targetHost = host,
                port,
                socketErrorCode = sockEx.SocketErrorCode.ToString(),
                nativeErrorCode = sockEx.NativeErrorCode,
                latencyMs = sw.ElapsedMilliseconds,
                error = sockEx.Message
            }, new JsonSerializerOptions { WriteIndented = true });

            return new ToolExecutionResult(
                Status: "FAIL",
                MetricValue: $"Port {port} REFUSED ({sockEx.SocketErrorCode})",
                RawOutput: outputJson,
                ErrorMessage: $"Socket error connecting to {host}:{port}: {sockEx.Message}"
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: $"Port {port} Handshake Error",
                RawOutput: ex.ToString(),
                ErrorMessage: ex.Message
            );
        }
    }
}
