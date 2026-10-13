using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InfraSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ToolsController : ControllerBase
{
    private readonly IEnumerable<IToolExecutor> _toolExecutors;

    public ToolsController(IEnumerable<IToolExecutor> toolExecutors)
    {
        _toolExecutors = toolExecutors;
    }

    public record TestToolRequest(
        string ToolType,
        string? TargetHost,
        string? ParametersJson
    );

    [HttpPost("test")]
    public async Task<IActionResult> TestTool([FromBody] TestToolRequest request, CancellationToken cancellationToken)
    {
        var executor = _toolExecutors.FirstOrDefault(e => e.ToolType.Equals(request.ToolType, StringComparison.OrdinalIgnoreCase));
        if (executor == null)
        {
            return BadRequest(new { message = $"No executor found for tool type '{request.ToolType}'" });
        }

        JsonElement parametersJson;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(request.ParametersJson) ? "{}" : request.ParametersJson);
            parametersJson = doc.RootElement.Clone();
        }
        catch
        {
            using var doc = JsonDocument.Parse("{}");
            parametersJson = doc.RootElement.Clone();
        }

        var context = new ToolExecutionContext(
            RunId: Guid.NewGuid(),
            StepKey: "adhoc_test",
            TargetHost: request.TargetHost,
            Parameters: parametersJson,
            CancellationToken: cancellationToken
        );

        var result = await executor.ExecuteAsync(context);
        return Ok(result);
    }

    [HttpGet("types")]
    public IActionResult GetAvailableToolTypes()
    {
        var tools = _toolExecutors.Select(e => new
        {
            toolType = e.ToolType,
            description = e.ToolType switch
            {
                "DISK_CHECK" => "Inspects drive volume storage capacity and alerts on low disk percentage",
                "RDP_PORT_CHECK" => "Conducts TCP handshake probe against port 3389 to test accessibility and measure latency",
                "SQL_JOB_CHECK" => "Inspects SQL Server Agent job history and instance state via Microsoft.Data.SqlClient",
                "URL_CHECK_EXT" => "Sends resilient HTTP/S requests with Polly retries to external URLs",
                "URL_CHECK_INT" => "Sends resilient HTTP/S requests with Polly retries to internal endpoints",
                "SERVICE_ACTION" => "Monitors, starts, or restarts Windows services",
                "VOICE_CALL_ACTION" => "Triggers automated outbound voice phone call to On-Call PIC via Telephony API",
                _ => "Custom infrastructure diagnostic tool"
            }
        });

        return Ok(tools);
    }
}
