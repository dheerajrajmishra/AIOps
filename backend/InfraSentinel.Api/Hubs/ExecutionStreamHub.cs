using Microsoft.AspNetCore.SignalR;

namespace InfraSentinel.Api.Hubs;

public class ExecutionStreamHub : Hub<IExecutionStreamClient>
{
    private readonly ILogger<ExecutionStreamHub> _logger;

    public ExecutionStreamHub(ILogger<ExecutionStreamHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinRun(string runId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"run_{runId}");
        _logger.LogInformation("Client {ConnectionId} joined run stream {RunId}", Context.ConnectionId, runId);
    }

    public async Task LeaveRun(string runId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"run_{runId}");
        _logger.LogInformation("Client {ConnectionId} left run stream {RunId}", Context.ConnectionId, runId);
    }

    public async Task JoinGlobal()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "global_noc");
        _logger.LogInformation("Client {ConnectionId} joined global NOC stream", Context.ConnectionId);
    }

    public async Task LeaveGlobal()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "global_noc");
    }
}
