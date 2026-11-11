using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;
using ShipmentCheckerPro.Api.Services;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/settings/section-rules")]
public class SectionRulesController(
    ShipmentCheckerDbContext context,
    IProductClassificationService classificationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SectionRuleDto>>> List(CancellationToken cancellationToken)
    {
        var rules = await context.SectionRules
            .AsNoTracking()
            .OrderBy(rule => rule.Priority)
            .ThenBy(rule => rule.Id)
            .Select(rule => ToDto(rule))
            .ToListAsync(cancellationToken);

        return Ok(rules);
    }

    [HttpPost]
    public async Task<ActionResult<SectionRuleDto>> Create(
        UpsertSectionRuleRequest request,
        CancellationToken cancellationToken)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return BadRequest(new { message = validation });
        }

        var rule = new SectionRule
        {
            Keyword = request.Keyword.Trim(),
            MainSection = request.MainSection.Trim(),
            Category = request.Category.Trim(),
            SubCategory = request.SubCategory.Trim(),
            Priority = request.Priority,
            IsActive = request.IsActive,
            CreatedBy = string.IsNullOrWhiteSpace(request.CreatedBy) ? "Manager" : request.CreatedBy.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        context.SectionRules.Add(rule);
        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(List), ToDto(rule));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SectionRuleDto>> Update(
        int id,
        UpsertSectionRuleRequest request,
        CancellationToken cancellationToken)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return BadRequest(new { message = validation });
        }

        var rule = await context.SectionRules.FindAsync([id], cancellationToken);
        if (rule is null)
        {
            return NotFound(new { message = "Section rule not found." });
        }

        rule.Keyword = request.Keyword.Trim();
        rule.MainSection = request.MainSection.Trim();
        rule.Category = request.Category.Trim();
        rule.SubCategory = request.SubCategory.Trim();
        rule.Priority = request.Priority;
        rule.IsActive = request.IsActive;

        await context.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(rule));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var rule = await context.SectionRules.FindAsync([id], cancellationToken);
        if (rule is null)
        {
            return NotFound(new { message = "Section rule not found." });
        }

        context.SectionRules.Remove(rule);
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(
        IReadOnlyList<ReorderSectionRuleRequest> request,
        CancellationToken cancellationToken)
    {
        var ids = request.Select(item => item.Id).ToHashSet();
        var rules = await context.SectionRules
            .Where(rule => ids.Contains(rule.Id))
            .ToListAsync(cancellationToken);

        foreach (var rule in rules)
        {
            var update = request.First(item => item.Id == rule.Id);
            rule.Priority = update.Priority;
        }

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("test")]
    public async Task<ActionResult<ClassificationResult>> Test(
        TestClassificationRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ProductName))
        {
            return BadRequest(new { message = "Product name is required." });
        }

        var result = await classificationService.ClassifyAsync(request.ProductName, request.ProductType, cancellationToken);
        return Ok(result);
    }

    private static SectionRuleDto ToDto(SectionRule rule)
    {
        return new SectionRuleDto(
            rule.Id,
            rule.Keyword,
            rule.MainSection,
            rule.Category,
            rule.SubCategory,
            rule.Priority,
            rule.IsActive,
            rule.CreatedAt,
            rule.CreatedBy);
    }

    private static string? Validate(UpsertSectionRuleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Keyword))
        {
            return "Keyword is required.";
        }

        if (string.IsNullOrWhiteSpace(request.MainSection))
        {
            return "Main section is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return "Category is required.";
        }

        if (string.IsNullOrWhiteSpace(request.SubCategory))
        {
            return "Sub-category is required.";
        }

        if (request.Priority < 1)
        {
            return "Priority must be 1 or greater.";
        }

        return null;
    }
}
