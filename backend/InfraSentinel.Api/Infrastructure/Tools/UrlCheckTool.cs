using System.Diagnostics;
using System.Net;
using System.Text.Json;
using InfraSentinel.Api.Core.Interfaces;
using Polly;
using Polly.Retry;

namespace InfraSentinel.Api.Infrastructure.Tools;

public abstract class BaseUrlCheckTool : IToolExecutor
{
    private readonly ILogger _logger;
    private readonly HttpClient _httpClient;
    private readonly ResiliencePipeline _resiliencePipeline;

    public abstract string ToolType { get; }

    protected BaseUrlCheckTool(ILogger logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;

        // Build Polly retry pipeline for transient network errors
        _resiliencePipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 2,
                Delay = TimeSpan.FromMilliseconds(500),
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
            })
            .Build();
    }

    public async Task<ToolExecutionResult> ExecuteAsync(ToolExecutionContext context)
    {
        _logger.LogInformation("Executing {ToolType} on {TargetHost} for step {StepKey}",
            ToolType, context.TargetHost, context.StepKey);

        string url = context.TargetHost ?? "https://httpbin.org/status/200";
        int expectedStatusCode = 200;
        int timeoutSeconds = 10;
        string httpMethod = "GET";

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("url", out var urlProp) && urlProp.GetString() is { } u && !string.IsNullOrWhiteSpace(u))
            {
                url = u;
            }
            if (context.Parameters.TryGetProperty("expectedStatusCode", out var scProp) && scProp.TryGetInt32(out var sc))
            {
                expectedStatusCode = sc;
            }
            if (context.Parameters.TryGetProperty("timeoutSeconds", out var toProp) && toProp.TryGetInt32(out var to))
            {
                timeoutSeconds = to;
            }
            if (context.Parameters.TryGetProperty("httpMethod", out var hmProp) && hmProp.GetString() is { } hm)
            {
                httpMethod = hm.ToUpperInvariant();
            }
        }

        // Ensure scheme
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            url = "https://" + url;
        }

        var sw = Stopwatch.StartNew();

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.CancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

            var result = await _resiliencePipeline.ExecuteAsync(async state =>
            {
                using var request = new HttpRequestMessage(new HttpMethod(httpMethod), url);
                request.Headers.Add("User-Agent", "InfraSentinel-HealthProbe/1.0");
                return await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, state);
            }, cts.Token);

            sw.Stop();

            int actualStatusCode = (int)result.StatusCode;
            bool isSuccess = (actualStatusCode == expectedStatusCode) || 
                             (expectedStatusCode == 200 && actualStatusCode >= 200 && actualStatusCode < 300);

            var outputJson = JsonSerializer.Serialize(new
            {
                url,
                method = httpMethod,
                expectedStatusCode,
                actualStatusCode,
                statusText = result.StatusCode.ToString(),
                latencyMs = sw.ElapsedMilliseconds,
                contentType = result.Content.Headers.ContentType?.ToString(),
                isSuccess
            }, new JsonSerializerOptions { WriteIndented = true });

            string metric = $"HTTP {actualStatusCode} {result.StatusCode} ({sw.ElapsedMilliseconds}ms)";

            if (isSuccess)
            {
                return new ToolExecutionResult(
                    Status: "PASS",
                    MetricValue: metric,
                    RawOutput: outputJson
                );
            }
            else
            {
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: metric,
                    RawOutput: outputJson,
                    ErrorMessage: $"Expected status code {expectedStatusCode}, but received {actualStatusCode} {result.StatusCode}"
                );
            }
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "FAIL",
                MetricValue: $"HTTP TIMEOUT ({timeoutSeconds}s)",
                RawOutput: JsonSerializer.Serialize(new { url, timeoutSeconds, error = "Request timed out" }),
                ErrorMessage: $"HTTP request to {url} timed out after {timeoutSeconds}s"
            );
        }
        catch (HttpRequestException httpEx)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "FAIL",
                MetricValue: $"HTTP Conn Error ({httpEx.StatusCode?.ToString() ?? "Network"})",
                RawOutput: JsonSerializer.Serialize(new { url, error = httpEx.Message, statusCode = httpEx.StatusCode }),
                ErrorMessage: $"HTTP request to {url} failed: {httpEx.Message}"
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: "HTTP Probe Error",
                RawOutput: ex.ToString(),
                ErrorMessage: ex.Message
            );
        }
    }
}

public class ExternalUrlCheckTool : BaseUrlCheckTool
{
    public ExternalUrlCheckTool(ILogger<ExternalUrlCheckTool> logger, HttpClient httpClient)
        : base(logger, httpClient)
    {
    }

    public override string ToolType => "URL_CHECK_EXT";
}

public class InternalUrlCheckTool : BaseUrlCheckTool
{
    public InternalUrlCheckTool(ILogger<InternalUrlCheckTool> logger, HttpClient httpClient)
        : base(logger, httpClient)
    {
    }

    public override string ToolType => "URL_CHECK_INT";
}
