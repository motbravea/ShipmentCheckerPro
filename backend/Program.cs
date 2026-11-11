using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var apiUrls = Environment.GetEnvironmentVariable("SHIPMENTCHECKER_API_URLS")
    ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS")
    ?? "http://127.0.0.1:5085";

builder.WebHost.UseUrls(apiUrls.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

Directory.CreateDirectory(AppDataPaths.Root);

var connectionString = $"Data Source={AppDataPaths.DatabasePath}";

builder.Services.AddControllers();
builder.Services.AddDbContext<ShipmentCheckerDbContext>(options =>
{
    options.UseSqlite(connectionString);
});
builder.Services.AddScoped<IProductClassificationService, ProductClassificationService>();
builder.Services.AddScoped<ShipmentWorkflowService>();
builder.Services.AddScoped<ExcelShipmentImportService>();
builder.Services.AddScoped<ShipmentExportService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<AnalyticsExportService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://tauri.localhost",
                "https://tauri.localhost",
                "tauri://localhost")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

await DatabaseInitializer.InitializeAsync(app);

app.Run();
