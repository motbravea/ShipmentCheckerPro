using Microsoft.AspNetCore.Mvc;
using ShipmentCheckerPro.Api.Models;
using ShipmentCheckerPro.Api.Services;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
public class AnalyticsController(
    AnalyticsService analyticsService,
    AnalyticsExportService exportService) : ControllerBase
{
    [HttpGet("monthly")]
    public async Task<ActionResult<MonthlyAnalyticsDto>> Monthly(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var period = ResolvePeriod(year, month);
        if (period is null)
        {
            return BadRequest(new { message = "Select a valid year and month." });
        }

        return Ok(await analyticsService.BuildMonthlyAsync(period.Value.Year, period.Value.Month, cancellationToken));
    }

    [HttpGet("monthly/export-excel")]
    public async Task<IActionResult> ExportMonthly(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var period = ResolvePeriod(year, month);
        if (period is null)
        {
            return BadRequest(new { message = "Select a valid year and month." });
        }

        var export = await exportService.BuildMonthlyWorkbookAsync(period.Value.Year, period.Value.Month, cancellationToken);
        return File(export.Content, export.ContentType, export.FileName);
    }

    private static DateTime? ResolvePeriod(int? year, int? month)
    {
        var now = DateTime.UtcNow;
        var selectedYear = year ?? now.Year;
        var selectedMonth = month ?? now.Month;
        if (selectedYear is < 2000 or > 2100 || selectedMonth is < 1 or > 12) return null;
        return new DateTime(selectedYear, selectedMonth, 1);
    }
}
