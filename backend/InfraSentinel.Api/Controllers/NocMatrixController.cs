using InfraSentinel.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InfraSentinel.Api.Controllers;

[ApiController]
[Route("api/noc")]
public class NocMatrixController : ControllerBase
{
    private readonly INocMatrixService _nocMatrixService;
    private readonly IAiInferenceService _aiInferenceService;

    public NocMatrixController(INocMatrixService nocMatrixService, IAiInferenceService aiInferenceService)
    {
        _nocMatrixService = nocMatrixService;
        _aiInferenceService = aiInferenceService;
    }

    [HttpGet("matrix")]
    public async Task<IActionResult> GetMatrix()
    {
        var data = await _nocMatrixService.GetMatrixDataAsync();
        return Ok(data);
    }

    [HttpGet("ai-inference")]
    public async Task<IActionResult> GetAiInference()
    {
        var report = await _aiInferenceService.GenerateInferenceReportAsync();
        return Ok(report);
    }
}
