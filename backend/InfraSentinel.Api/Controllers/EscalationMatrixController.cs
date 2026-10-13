using InfraSentinel.Api.Infrastructure.Telephony;
using Microsoft.AspNetCore.Mvc;

namespace InfraSentinel.Api.Controllers;

public record EscalationDispatchRequest(
    string? AppOrTeam,
    int? SpecificLayer,
    string AlertMessage
);

[ApiController]
[Route("api/escalation")]
public class EscalationMatrixController : ControllerBase
{
    private readonly IEscalationMatrixService _escalationMatrixService;

    public EscalationMatrixController(IEscalationMatrixService escalationMatrixService)
    {
        _escalationMatrixService = escalationMatrixService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllGroups()
    {
        var groups = await _escalationMatrixService.GetAllGroupsAsync();
        return Ok(groups);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGroup(string id)
    {
        var group = await _escalationMatrixService.GetGroupByIdAsync(id);
        if (group == null) return NotFound(new { message = $"Escalation group {id} not found." });
        return Ok(group);
    }

    [HttpPost]
    public async Task<IActionResult> SaveGroup([FromBody] EscalationGroup group)
    {
        var saved = await _escalationMatrixService.SaveGroupAsync(group);
        return Ok(saved);
    }

    [HttpPost("dispatch")]
    public async Task<IActionResult> DispatchTest([FromBody] EscalationDispatchRequest request)
    {
        var result = await _escalationMatrixService.ExecuteMultiLayerEscalationAsync(
            request.AppOrTeam,
            request.SpecificLayer,
            request.AlertMessage
        );
        return Ok(result);
    }
}
