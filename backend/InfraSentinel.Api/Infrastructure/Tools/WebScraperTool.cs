using System.Diagnostics;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using InfraSentinel.Api.Core.Interfaces;
using Polly;
using Polly.Retry;

namespace InfraSentinel.Api.Infrastructure.Tools;

public class WebScraperTool : IToolExecutor
{
    private readonly ILogger<WebScraperTool> _logger;
    private readonly HttpClient _httpClient;
    private readonly ResiliencePipeline _resiliencePipeline;

    public string ToolType => "WEB_SCRAPER";

    public WebScraperTool(ILogger<WebScraperTool> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;

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
        _logger.LogInformation("Executing WebScraperTool on {TargetHost} for step {StepKey}",
            context.TargetHost, context.StepKey);

        string url = context.TargetHost ?? "https://example.com";
        string selectorType = "CSS"; // CSS, XPATH, REGEX, METADATA
        string selector = "h1";
        string? extractAttribute = null;
        string condition = "NOT_EMPTY"; // NOT_EMPTY, CONTAINS, NOT_CONTAINS, EQUALS, EXISTS
        string expectedValue = "";
        int timeoutSeconds = 15;
        string userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 InfraSentinel/1.0";

        if (context.Parameters.ValueKind == JsonValueKind.Object)
        {
            if (context.Parameters.TryGetProperty("url", out var urlProp) && urlProp.GetString() is { } u && !string.IsNullOrWhiteSpace(u))
            {
                url = u;
            }
            if (context.Parameters.TryGetProperty("selectorType", out var stProp) && stProp.GetString() is { } st)
            {
                selectorType = st.ToUpperInvariant();
            }
            if (context.Parameters.TryGetProperty("selector", out var selProp) && selProp.GetString() is { } sel)
            {
                selector = sel;
            }
            if (context.Parameters.TryGetProperty("extractAttribute", out var attrProp) && attrProp.GetString() is { } attr)
            {
                extractAttribute = attr;
            }
            if (context.Parameters.TryGetProperty("condition", out var condProp) && condProp.GetString() is { } cond)
            {
                condition = cond.ToUpperInvariant();
            }
            if (context.Parameters.TryGetProperty("expectedValue", out var expProp) && expProp.GetString() is { } exp)
            {
                expectedValue = exp;
            }
            if (context.Parameters.TryGetProperty("timeoutSeconds", out var toProp) && toProp.TryGetInt32(out var to))
            {
                timeoutSeconds = Math.Clamp(to, 3, 60);
            }
            if (context.Parameters.TryGetProperty("userAgent", out var uaProp) && uaProp.GetString() is { } ua)
            {
                userAgent = ua;
            }
        }

        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            url = "https://" + url;
        }

        var sw = Stopwatch.StartNew();

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.CancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

            var response = await _resiliencePipeline.ExecuteAsync(async state =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("User-Agent", userAgent);
                request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                return await _httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, state);
            }, cts.Token);

            sw.Stop();

            int statusCode = (int)response.StatusCode;
            if (!response.IsSuccessStatusCode)
            {
                return new ToolExecutionResult(
                    Status: "FAIL",
                    MetricValue: $"HTTP {statusCode} {response.ReasonPhrase}",
                    RawOutput: JsonSerializer.Serialize(new { url, statusCode, error = response.ReasonPhrase, durationMs = sw.ElapsedMilliseconds }),
                    ErrorMessage: $"Target website returned non-success HTTP status {statusCode} ({response.ReasonPhrase})"
                );
            }

            string html = await response.Content.ReadAsStringAsync(cts.Token);
            var htmlDoc = new HtmlDocument();
            htmlDoc.LoadHtml(html);

            // Extract page title
            string pageTitle = htmlDoc.DocumentNode.SelectSingleNode("//title")?.InnerText?.Trim() ?? "No title tag";
            pageTitle = WebUtility.HtmlDecode(pageTitle);

            var extractedItems = new List<string>();

            if (selectorType == "XPATH")
            {
                var nodes = htmlDoc.DocumentNode.SelectNodes(selector);
                if (nodes != null)
                {
                    foreach (var n in nodes.Take(10))
                    {
                        var val = string.IsNullOrWhiteSpace(extractAttribute)
                            ? n.InnerText?.Trim()
                            : n.GetAttributeValue(extractAttribute, "");
                        if (!string.IsNullOrWhiteSpace(val))
                        {
                            extractedItems.Add(WebUtility.HtmlDecode(val));
                        }
                    }
                }
            }
            else if (selectorType == "REGEX")
            {
                var match = Regex.Match(html, selector, RegexOptions.IgnoreCase | RegexOptions.Singleline);
                while (match.Success && extractedItems.Count < 10)
                {
                    string val = match.Groups.Count > 1 ? match.Groups[1].Value : match.Value;
                    extractedItems.Add(val.Trim());
                    match = match.NextMatch();
                }
            }
            else // Default: CSS / Tag / Class name
            {
                var matchedNodes = htmlDoc.DocumentNode.Descendants()
                    .Where(n => n.NodeType == HtmlNodeType.Element)
                    .Where(n =>
                    {
                        if (selector.StartsWith("#"))
                        {
                            return string.Equals(n.Id, selector[1..], StringComparison.OrdinalIgnoreCase);
                        }
                        if (selector.StartsWith("."))
                        {
                            var targetClass = selector[1..];
                            var classAttr = n.GetAttributeValue("class", "");
                            return classAttr.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                .Any(c => string.Equals(c, targetClass, StringComparison.OrdinalIgnoreCase));
                        }
                        if (selector.Contains('.'))
                        {
                            var parts = selector.Split('.', 2);
                            var classAttr = n.GetAttributeValue("class", "");
                            bool hasClass = classAttr.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                .Any(c => string.Equals(c, parts[1], StringComparison.OrdinalIgnoreCase));
                            return string.Equals(n.Name, parts[0], StringComparison.OrdinalIgnoreCase) && hasClass;
                        }
                        return string.Equals(n.Name, selector, StringComparison.OrdinalIgnoreCase);
                    });

                foreach (var n in matchedNodes.Take(10))
                {
                    var val = string.IsNullOrWhiteSpace(extractAttribute)
                        ? n.InnerText?.Trim()
                        : n.GetAttributeValue(extractAttribute, "");
                    if (!string.IsNullOrWhiteSpace(val))
                    {
                        extractedItems.Add(WebUtility.HtmlDecode(val));
                    }
                }

                // If nothing was found, but selector is 'title', fall back to pageTitle
                if (extractedItems.Count == 0 && selector.Equals("title", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(pageTitle))
                {
                    extractedItems.Add(pageTitle);
                }
            }

            string combinedExtractedText = string.Join(" | ", extractedItems);
            bool isConditionMet;

            switch (condition)
            {
                case "CONTAINS":
                    isConditionMet = combinedExtractedText.Contains(expectedValue, StringComparison.OrdinalIgnoreCase);
                    break;
                case "NOT_CONTAINS":
                    isConditionMet = !combinedExtractedText.Contains(expectedValue, StringComparison.OrdinalIgnoreCase);
                    break;
                case "EQUALS":
                    isConditionMet = combinedExtractedText.Equals(expectedValue, StringComparison.OrdinalIgnoreCase);
                    break;
                case "EXISTS":
                    isConditionMet = extractedItems.Count > 0;
                    break;
                case "NOT_EMPTY":
                default:
                    isConditionMet = !string.IsNullOrWhiteSpace(combinedExtractedText);
                    break;
            }

            string status = isConditionMet ? "PASS" : "FAIL";
            string sampleSnippet = extractedItems.Count > 0 ? extractedItems[0] : "(no match)";
            if (sampleSnippet.Length > 60) sampleSnippet = sampleSnippet[..57] + "...";

            string metricValue = $"{status}: '{sampleSnippet}' ({extractedItems.Count} items, {sw.ElapsedMilliseconds}ms)";

            var resultPayload = new
            {
                url,
                title = pageTitle,
                selectorType,
                selector,
                extractAttribute,
                condition,
                expectedValue,
                isConditionMet,
                matchedCount = extractedItems.Count,
                extractedItems,
                latencyMs = sw.ElapsedMilliseconds,
                htmlLengthBytes = html.Length,
                htmlSnippet = html.Length > 250 ? html[..250] : html
            };

            return new ToolExecutionResult(
                Status: status,
                MetricValue: metricValue,
                RawOutput: JsonSerializer.Serialize(resultPayload, new JsonSerializerOptions { WriteIndented = true }),
                ErrorMessage: isConditionMet ? null : $"Assertion failed: Extracted '{combinedExtractedText}' did not satisfy condition '{condition}' with expected value '{expectedValue}'"
            );
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            return new ToolExecutionResult(
                Status: "FAIL",
                MetricValue: $"Timed Out ({timeoutSeconds}s)",
                RawOutput: JsonSerializer.Serialize(new { url, error = "Execution timed out" }),
                ErrorMessage: $"Web scraper timed out after {timeoutSeconds} seconds while requesting {url}"
            );
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "WebScraperTool error while scraping {Url}", url);
            return new ToolExecutionResult(
                Status: "ERROR",
                MetricValue: "Scraping Failed",
                RawOutput: JsonSerializer.Serialize(new { url, error = ex.Message }),
                ErrorMessage: $"Web scraping failed: {ex.Message}"
            );
        }
    }
}
