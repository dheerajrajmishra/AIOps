using InfraSentinel.Api.Core.Interfaces;
using InfraSentinel.Api.Engine;
using InfraSentinel.Api.Hubs;
using InfraSentinel.Api.Infrastructure.Data;
using InfraSentinel.Api.Infrastructure.Telephony;
using InfraSentinel.Api.Infrastructure.Tools;
using InfraSentinel.Api.Scheduling;
using InfraSentinel.Api.Services;
using Microsoft.EntityFrameworkCore;
using Quartz;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection & EF Core
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost\\SQLEXPRESS;Database=InfraSentinelDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

builder.Services.AddDbContext<InfraSentinelDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    }));

// 2. Dapper SQL Connection Factory
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();

// 3. Telephony Service & HTTP Client
builder.Services.AddHttpClient<ITelephonyService, TelephonyService>();
builder.Services.AddSingleton<IEscalationMatrixService, EscalationMatrixService>();

// Cognitive AI Inference Service
builder.Services.AddScoped<IAiInferenceService, AiInferenceService>();

// 4. Register All Tool Executors
builder.Services.AddScoped<IToolExecutor, DiskCheckTool>();
builder.Services.AddScoped<IToolExecutor, RdpPortCheckTool>();
builder.Services.AddScoped<IToolExecutor, SqlJobCheckTool>();
builder.Services.AddScoped<IToolExecutor, ExternalUrlCheckTool>();
builder.Services.AddScoped<IToolExecutor, InternalUrlCheckTool>();
builder.Services.AddScoped<IToolExecutor, ServiceActionTool>();
builder.Services.AddScoped<IToolExecutor, VoiceCallActionTool>();
builder.Services.AddScoped<IToolExecutor, WebScraperTool>();

// 5. DAG Execution Engine
builder.Services.AddScoped<IDagExecutionEngine, DagExecutionEngine>();

// 6. NOC Matrix Reporting Service (Dapper)
builder.Services.AddScoped<INocMatrixService, NocMatrixService>();

// 7. Real-time Communication (SignalR)
builder.Services.AddSignalR(hubOptions =>
{
    hubOptions.EnableDetailedErrors = true;
});

// 8. Quartz.NET Scheduling
builder.Services.AddQuartz();
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = false);

builder.Services.AddSingleton<WorkflowSchedulerService>();
builder.Services.AddSingleton<IWorkflowSchedulerService>(sp => sp.GetRequiredService<WorkflowSchedulerService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<WorkflowSchedulerService>());

// 9. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 10. CORS Policy for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();

app.MapControllers();
app.MapHub<ExecutionStreamHub>("/hubs/execution-stream");

// Initialize Database & Seed Sample Workflows
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var dbContext = scope.ServiceProvider.GetRequiredService<InfraSentinelDbContext>();
    try
    {
        await DbInitializer.InitializeAsync(dbContext, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database migration/seeding.");
    }
}

app.Run();
