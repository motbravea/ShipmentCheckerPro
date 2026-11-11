using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;
using ShipmentCheckerPro.Api.Services;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/testers")]
public class TestersController(
    ShipmentCheckerDbContext context,
    IProductClassificationService classificationService) : ControllerBase
{
    private static readonly HashSet<string> ValidStatuses =
    [
        TesterStatuses.PendingApproval,
        TesterStatuses.Active,
        TesterStatuses.Inactive,
        TesterStatuses.Stolen,
        TesterStatuses.Damaged,
        TesterStatuses.Lost,
        TesterStatuses.Replaced
    ];

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TesterListItemDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? mainSection,
        CancellationToken cancellationToken)
    {
        var query = context.Testers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(tester =>
                tester.TesterCode.Contains(term) ||
                tester.ProductName.Contains(term) ||
                tester.Barcode.Contains(term) ||
                (tester.SKU != null && tester.SKU.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(tester => tester.Status == status.Trim());
        }

        if (!string.IsNullOrWhiteSpace(mainSection))
        {
            query = query.Where(tester => tester.MainSection == mainSection.Trim());
        }

        var testers = await query
            .OrderBy(tester => tester.Status == TesterStatuses.PendingApproval ? 0 : 1)
            .ThenBy(tester => tester.ProductName)
            .Select(tester => ToListItem(tester))
            .ToListAsync(cancellationToken);

        return Ok(testers);
    }

    [HttpGet("product-lookup/{barcode}")]
    public async Task<ActionResult<ProductLookupDto>> ProductLookup(
        string barcode,
        CancellationToken cancellationToken)
    {
        var cleanBarcode = barcode.Trim();
        var product = await context.ProductCatalog
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Barcode == cleanBarcode, cancellationToken);

        if (product is null)
        {
            return NotFound(new { message = "Product was not found in the local catalog. Enter its product name manually." });
        }

        return Ok(new ProductLookupDto(
            product.Barcode,
            product.SKU,
            product.ProductName,
            product.ChineseProductName,
            product.MainSection,
            product.Category,
            product.SubCategory));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TesterDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var detail = await ToDetailAsync(id, cancellationToken);
        return detail is null ? NotFound(new { message = "Tester not found." }) : Ok(detail);
    }

    [HttpPost]
    public async Task<ActionResult<TesterDetailDto>> Create(
        CreateTesterRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.TesterCode))
        {
            return BadRequest(new { message = "Tester code is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Barcode))
        {
            return BadRequest(new { message = "Product barcode is required." });
        }

        if (request.Quantity < 1)
        {
            return BadRequest(new { message = "Quantity must be at least 1." });
        }

        var testerCode = request.TesterCode.Trim();
        if (await context.Testers.AnyAsync(tester => tester.TesterCode == testerCode, cancellationToken))
        {
            return BadRequest(new { message = "Tester code already exists." });
        }

        var barcode = request.Barcode.Trim();
        var catalog = await context.ProductCatalog
            .AsNoTracking()
            .FirstOrDefaultAsync(product => product.Barcode == barcode, cancellationToken);
        var productName = string.IsNullOrWhiteSpace(request.ProductName)
            ? catalog?.ProductName
            : request.ProductName.Trim();

        if (string.IsNullOrWhiteSpace(productName))
        {
            return BadRequest(new { message = "Product name is required when the barcode is not in the local catalog." });
        }

        var classification = catalog is null
            ? await classificationService.ClassifyAsync(productName, cancellationToken: cancellationToken)
            : new ClassificationResult(
                catalog.MainSection,
                catalog.Category,
                catalog.SubCategory,
                null,
                null);

        var now = DateTime.UtcNow;
        var tester = new Tester
        {
            TesterCode = testerCode,
            ProductName = productName,
            ChineseProductName = request.ChineseProductName?.Trim() ?? catalog?.ChineseProductName,
            SKU = request.SKU?.Trim() ?? catalog?.SKU,
            Barcode = barcode,
            MainSection = classification.MainSection,
            Category = classification.Category,
            SubCategory = classification.SubCategory,
            Quantity = request.Quantity,
            Status = TesterStatuses.PendingApproval,
            CreatedAt = now,
            CreatedBy = request.CreatedBy?.Trim(),
            LastStatusChangeAt = now,
            Notes = request.Notes?.Trim()
        };

        context.Testers.Add(tester);
        await context.SaveChangesAsync(cancellationToken);

        context.TesterHistory.Add(new TesterHistory
        {
            TesterId = tester.Id,
            NewStatus = TesterStatuses.PendingApproval,
            ChangedAt = now,
            ChangedBy = request.CreatedBy?.Trim(),
            Reason = "Tester created",
            Notes = request.Notes?.Trim()
        });
        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = tester.Id }, await ToDetailAsync(tester.Id, cancellationToken));
    }

    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<TesterDetailDto>> Approve(
        int id,
        ApproveTesterRequest request,
        CancellationToken cancellationToken)
    {
        var tester = await context.Testers.FindAsync([id], cancellationToken);
        if (tester is null)
        {
            return NotFound(new { message = "Tester not found." });
        }

        if (tester.Status != TesterStatuses.PendingApproval)
        {
            return BadRequest(new { message = "Only pending testers can be approved." });
        }

        await ChangeStatusAsync(tester, TesterStatuses.Active, request.ApprovedBy, "Manager approval", null, cancellationToken);
        tester.ApprovedBy = request.ApprovedBy?.Trim();
        await context.SaveChangesAsync(cancellationToken);

        return Ok(await ToDetailAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/status")]
    public async Task<ActionResult<TesterDetailDto>> UpdateStatus(
        int id,
        UpdateTesterStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!ValidStatuses.Contains(request.Status))
        {
            return BadRequest(new { message = "Invalid tester status." });
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "A reason is required for status changes." });
        }

        var tester = await context.Testers.FindAsync([id], cancellationToken);
        if (tester is null)
        {
            return NotFound(new { message = "Tester not found." });
        }

        if (tester.Status == request.Status)
        {
            return BadRequest(new { message = "Tester already has that status." });
        }

        await ChangeStatusAsync(
            tester,
            request.Status,
            request.ChangedBy,
            request.Reason.Trim(),
            request.Notes?.Trim(),
            cancellationToken);

        return Ok(await ToDetailAsync(id, cancellationToken));
    }

    private async Task ChangeStatusAsync(
        Tester tester,
        string status,
        string? changedBy,
        string reason,
        string? notes,
        CancellationToken cancellationToken)
    {
        var oldStatus = tester.Status;
        var now = DateTime.UtcNow;
        tester.Status = status;
        tester.LastStatusChangeAt = now;

        context.TesterHistory.Add(new TesterHistory
        {
            TesterId = tester.Id,
            OldStatus = oldStatus,
            NewStatus = status,
            ChangedAt = now,
            ChangedBy = changedBy?.Trim(),
            Reason = reason,
            Notes = notes
        });

        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<TesterDetailDto?> ToDetailAsync(int id, CancellationToken cancellationToken)
    {
        var tester = await context.Testers
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (tester is null)
        {
            return null;
        }

        var history = await context.TesterHistory
            .AsNoTracking()
            .Where(item => item.TesterId == id)
            .OrderByDescending(item => item.ChangedAt)
            .Select(item => new TesterHistoryDto(
                item.Id,
                item.OldStatus,
                item.NewStatus,
                item.ChangedAt,
                item.ChangedBy,
                item.Reason,
                item.Notes))
            .ToListAsync(cancellationToken);

        return new TesterDetailDto(
            tester.Id,
            tester.TesterCode,
            tester.ProductName,
            tester.ChineseProductName,
            tester.SKU,
            tester.Barcode,
            tester.MainSection,
            tester.Category,
            tester.SubCategory,
            tester.Quantity,
            tester.Status,
            tester.CreatedAt,
            tester.CreatedBy,
            tester.ApprovedBy,
            tester.LastSeenAt,
            tester.LastStatusChangeAt,
            tester.LastAuditAt,
            tester.MissedAuditCount,
            tester.Notes,
            tester.PhotoPath,
            history);
    }

    private static TesterListItemDto ToListItem(Tester tester) => new(
        tester.Id,
        tester.TesterCode,
        tester.ProductName,
        tester.SKU,
        tester.Barcode,
        tester.MainSection,
        tester.Category,
        tester.SubCategory,
        tester.Quantity,
        tester.Status,
        tester.CreatedAt,
        tester.LastSeenAt,
        tester.LastAuditAt,
        tester.MissedAuditCount);
}
