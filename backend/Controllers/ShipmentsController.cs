using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;
using ShipmentCheckerPro.Api.Services;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/shipments")]
public class ShipmentsController(
    ShipmentCheckerDbContext context,
    ExcelShipmentImportService excelImportService,
    ShipmentExportService exportService,
    ShipmentWorkflowService workflowService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ShipmentDetailDto>> Create(
        CreateShipmentRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Shipment name is required." });
        }

        var shipment = new Shipment
        {
            Name = request.Name.Trim(),
            OrderNumber = request.OrderNumber?.Trim(),
            OrderReference = request.OrderReference?.Trim(),
            StoreName = request.StoreName?.Trim(),
            StoreCode = request.StoreCode?.Trim(),
            SupplierName = request.SupplierName?.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedBy = request.CreatedBy?.Trim(),
            Status = ShipmentStatuses.Draft,
            CreatedAt = DateTime.UtcNow
        };

        context.Shipments.Add(shipment);
        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = shipment.Id }, await ToDetailAsync(shipment.Id, cancellationToken));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShipmentListItemDto>>> List(CancellationToken cancellationToken)
    {
        var shipments = await context.Shipments
            .AsNoTracking()
            .Where(shipment => !shipment.IsArchived)
            .OrderByDescending(shipment => shipment.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(await ToListItemsAsync(shipments, cancellationToken));
    }

    [HttpGet("archive")]
    public async Task<ActionResult<IReadOnlyList<ShipmentListItemDto>>> Archive(CancellationToken cancellationToken)
    {
        var shipments = await context.Shipments
            .AsNoTracking()
            .Where(shipment => shipment.IsArchived)
            .OrderByDescending(shipment => shipment.CompletedAt ?? shipment.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(await ToListItemsAsync(shipments, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ShipmentDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var detail = await ToDetailAsync(id, cancellationToken);
        return detail is null ? NotFound(new { message = "Shipment not found." }) : Ok(detail);
    }

    [HttpPost("{id:int}/import-excel")]
    [RequestSizeLimit(25_000_000)]
    public async Task<ActionResult<ImportSummaryDto>> ImportExcel(
        int id,
        IFormFile file,
        [FromForm] string? employeeName,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked. Create a Manual Adjustment to make changes." });
        }

        try
        {
            return Ok(await excelImportService.ImportAsync(shipment, file, employeeName, cancellationToken));
        }
        catch (IOException)
        {
            return BadRequest(new { message = "The file appears to be open in Excel. Close it and try again." });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("{id:int}/summary")]
    public async Task<ActionResult<ShipmentSummaryDto>> Summary(int id, CancellationToken cancellationToken)
    {
        if (!await context.Shipments.AnyAsync(shipment => shipment.Id == id, cancellationToken))
        {
            return NotFound(new { message = "Shipment not found." });
        }

        return Ok(await workflowService.GetSummaryAsync(id, cancellationToken));
    }

    [HttpGet("{id:int}/items")]
    public async Task<ActionResult<IReadOnlyList<ShipmentItemDto>>> Items(int id, CancellationToken cancellationToken)
    {
        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == id)
            .OrderBy(item => item.BoxNumber)
            .ThenBy(item => item.ProductName)
            .Select(item => ShipmentWorkflowService.ToDto(item))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id:int}/discrepancies")]
    public async Task<ActionResult<object>> Discrepancies(int id, CancellationToken cancellationToken)
    {
        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == id && item.Status != ItemStatuses.Matched)
            .OrderBy(item => item.Status)
            .ThenBy(item => item.ProductName)
            .Select(item => ShipmentWorkflowService.ToDto(item))
            .ToListAsync(cancellationToken);

        var unknownItems = await context.UnknownItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == id && item.ResolvedAt == null)
            .OrderByDescending(item => item.LastScannedAt)
            .Select(item => new UnknownItemDto(
                item.Id,
                item.Barcode,
                item.ScannedQuantity,
                item.FirstScannedAt,
                item.LastScannedAt))
            .ToListAsync(cancellationToken);

        return Ok(new { items, unknownItems });
    }

    [HttpGet("{id:int}/export-excel")]
    public async Task<IActionResult> ExportExcel(int id, CancellationToken cancellationToken)
    {
        var export = await exportService.BuildShipmentWorkbookAsync(id, cancellationToken);
        if (export is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        return File(export.Content, export.ContentType, export.FileName);
    }

    [HttpGet("{id:int}/scan-history")]
    public async Task<ActionResult<IReadOnlyList<ScanHistoryDto>>> ScanHistory(int id, CancellationToken cancellationToken)
    {
        return Ok(await workflowService.GetRecentScansAsync(id, 200, cancellationToken));
    }

    [HttpGet("{id:int}/completion")]
    public async Task<ActionResult<ShipmentCompletionDto>> Completion(
        int id,
        CancellationToken cancellationToken)
    {
        var completion = await BuildCompletionAsync(id, cancellationToken);
        return completion is null
            ? NotFound(new { message = "Shipment not found." })
            : Ok(completion);
    }

    [HttpPost("{id:int}/complete")]
    public async Task<ActionResult<ShipmentCompletionDto>> CompleteShipment(
        int id,
        CompleteShipmentRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.IsArchived)
        {
            return BadRequest(new { message = "Archived shipments cannot be completed again." });
        }

        var completion = await BuildCompletionAsync(id, cancellationToken);
        if (completion is null || !completion.HasImportedProducts)
        {
            return BadRequest(new { message = "Import shipment products before completing this shipment." });
        }

        if (!completion.AllBoxesComplete)
        {
            return BadRequest(new { message = "Complete every box before completing this shipment." });
        }

        if (completion.HasDiscrepancies && !request.AcknowledgeDiscrepancies)
        {
            return BadRequest(new { message = "Review and acknowledge the remaining discrepancies first." });
        }

        shipment.Status = ShipmentStatuses.Completed;
        shipment.CompletedAt = DateTime.UtcNow;
        shipment.CompletedBy = request.EmployeeName?.Trim();
        shipment.CurrentBoxNumber = null;
        await context.SaveChangesAsync(cancellationToken);

        return Ok(await BuildCompletionAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> ArchiveShipment(int id, CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.Status != ShipmentStatuses.Completed)
        {
            return BadRequest(new { message = "Complete the shipment before archiving it." });
        }

        shipment.IsArchived = true;
        shipment.Status = ShipmentStatuses.Archived;
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> RestoreShipment(int id, CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        shipment.IsArchived = false;
        shipment.Status = ShipmentStatuses.Completed;
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:int}/boxes")]
    public async Task<ActionResult<IReadOnlyList<BoxProgressDto>>> Boxes(int id, CancellationToken cancellationToken)
    {
        return Ok(await workflowService.GetBoxesAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/boxes")]
    public async Task<IActionResult> CreateBox(
        int id,
        CreateBoxRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (string.IsNullOrWhiteSpace(request.BoxNumber))
        {
            return BadRequest(new { message = "Box number is required." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked. Create a Manual Adjustment to make changes." });
        }

        var boxNumber = request.BoxNumber.Trim();
        await EnsureBoxAsync(id, boxNumber, cancellationToken);
        shipment.CurrentBoxNumber = boxNumber;
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:int}/current-box")]
    public async Task<IActionResult> SetCurrentBox(
        int id,
        UpdateCurrentBoxRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (string.IsNullOrWhiteSpace(request.BoxNumber))
        {
            return BadRequest(new { message = "Box number is required." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked." });
        }

        shipment.CurrentBoxNumber = request.BoxNumber.Trim();
        await EnsureBoxAsync(id, shipment.CurrentBoxNumber, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/boxes/{boxNumber}/complete")]
    public async Task<IActionResult> CompleteBox(
        int id,
        string boxNumber,
        CompleteBoxRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked." });
        }

        var box = await context.ShipmentBoxes
            .FirstOrDefaultAsync(candidate => candidate.ShipmentId == id && candidate.BoxNumber == boxNumber, cancellationToken);

        if (box is null)
        {
            return NotFound(new { message = "Box not found." });
        }

        box.IsComplete = true;
        box.CompletedAt = DateTime.UtcNow;
        box.CompletedBy = request.EmployeeName;
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/scan")]
    public async Task<ActionResult<ScanResponse>> Scan(
        int id,
        ScanRequest request,
        CancellationToken cancellationToken)
    {
        var barcode = request.Barcode?.Trim();
        var quantity = request.Quantity <= 0 ? 1 : request.Quantity;

        if (string.IsNullOrWhiteSpace(barcode))
        {
            return BadRequest(new { message = "Barcode is required." });
        }

        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked. Create a Manual Adjustment to make changes." });
        }

        var boxNumber = string.IsNullOrWhiteSpace(request.BoxNumber) ? shipment.CurrentBoxNumber : request.BoxNumber.Trim();

        if (request.ConfirmShipmentItemId is not null)
        {
            var confirmedItem = await context.ShipmentItems
                .FirstOrDefaultAsync(item => item.Id == request.ConfirmShipmentItemId && item.ShipmentId == id, cancellationToken);

            if (confirmedItem is null)
            {
                return NotFound(new { message = "Suggested item not found." });
            }

            return Ok(await ApplyItemScanAsync(shipment, confirmedItem, barcode, quantity, request.EmployeeName, boxNumber, "SKUFallback", cancellationToken));
        }

        var exactItem = await context.ShipmentItems
            .FirstOrDefaultAsync(item => item.ShipmentId == id && item.Barcode == barcode, cancellationToken);

        if (exactItem is not null)
        {
            return Ok(await ApplyItemScanAsync(shipment, exactItem, barcode, quantity, request.EmployeeName, boxNumber, "Scan", cancellationToken));
        }

        var skuMatches = await FindSkuMatchesAsync(id, barcode, cancellationToken);
        if (skuMatches.Count == 1)
        {
            var summary = await workflowService.GetSummaryAsync(id, cancellationToken);
            var recent = await workflowService.GetRecentScansAsync(id, cancellationToken: cancellationToken);
            return Ok(new ScanResponse(
                ScanOutcomes.SkuSuggestion,
                $"Did you mean {skuMatches[0].ProductName}?",
                null,
                null,
                ShipmentWorkflowService.ToDto(skuMatches[0]),
                null,
                summary,
                recent));
        }

        var catalogMatch = await context.ProductCatalog
            .AsNoTracking()
            .FirstOrDefaultAsync(product => product.Barcode == barcode, cancellationToken);

        if (catalogMatch is not null && !request.ConfirmLogUnknown)
        {
            var summary = await workflowService.GetSummaryAsync(id, cancellationToken);
            var recent = await workflowService.GetRecentScansAsync(id, cancellationToken: cancellationToken);
            return Ok(new ScanResponse(
                ScanOutcomes.CatalogSuggestion,
                "This product was received before but is not in the current shipment. Log as unknown?",
                null,
                null,
                null,
                new ProductCatalogSuggestionDto(
                    catalogMatch.Barcode,
                    catalogMatch.SKU,
                    catalogMatch.ProductName,
                    catalogMatch.MainSection,
                    catalogMatch.Category,
                    catalogMatch.SubCategory),
                summary,
                recent));
        }

        return Ok(await ApplyUnknownScanAsync(shipment, barcode, quantity, request.EmployeeName, boxNumber, cancellationToken));
    }

    [HttpPost("{id:int}/undo-last-scan")]
    public async Task<ActionResult<ScanResponse>> UndoLastScan(
        int id,
        [FromBody] CompleteBoxRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments.FindAsync([id], cancellationToken);
        if (shipment is null)
        {
            return NotFound(new { message = "Shipment not found." });
        }

        if (shipment.Status is ShipmentStatuses.Completed or ShipmentStatuses.Archived || shipment.IsArchived)
        {
            return BadRequest(new { message = "This shipment is locked. Completed scans cannot be undone." });
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var lastScan = await context.ScanHistory
            .Where(scan => scan.ShipmentId == id && !scan.WasUndo && scan.ActionType != "Undo")
            .OrderByDescending(scan => scan.ScanTime)
            .FirstOrDefaultAsync(cancellationToken);

        if (lastScan is null)
        {
            return BadRequest(new { message = "No scan is available to undo." });
        }

        ShipmentItemDto? itemDto = null;
        UnknownItemDto? unknownDto = null;

        if (lastScan.ShipmentItemId is not null)
        {
            var item = await context.ShipmentItems.FindAsync([lastScan.ShipmentItemId.Value], cancellationToken);
            if (item is not null)
            {
                item.ScannedQuantity = Math.Max(0, item.ScannedQuantity - lastScan.QuantityAdded);
                ShipmentWorkflowService.UpdateItemStatus(item);
                itemDto = ShipmentWorkflowService.ToDto(item);
            }
        }
        else
        {
            var unknown = await context.UnknownItems
                .FirstOrDefaultAsync(item => item.ShipmentId == id && item.Barcode == lastScan.Barcode && item.ResolvedAt == null, cancellationToken);

            if (unknown is not null)
            {
                unknown.ScannedQuantity = Math.Max(0, unknown.ScannedQuantity - lastScan.QuantityAdded);
                unknown.LastScannedAt = DateTime.UtcNow;
                unknownDto = new UnknownItemDto(
                    unknown.Id,
                    unknown.Barcode,
                    unknown.ScannedQuantity,
                    unknown.FirstScannedAt,
                    unknown.LastScannedAt);
            }
        }

        lastScan.WasUndo = true;
        context.ScanHistory.Add(new ScanHistory
        {
            ShipmentId = id,
            ShipmentItemId = lastScan.ShipmentItemId,
            Barcode = lastScan.Barcode,
            ProductName = lastScan.ProductName,
            SKU = lastScan.SKU,
            QuantityAdded = -lastScan.QuantityAdded,
            ScanTime = DateTime.UtcNow,
            EmployeeName = request.EmployeeName,
            ActionType = "Undo",
            BoxNumber = lastScan.BoxNumber,
            WasUndo = true
        });

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Ok(new ScanResponse(
            itemDto is null ? ScanOutcomes.Unknown : ScanOutcomes.Matched,
            $"Undid scan {lastScan.Barcode}.",
            itemDto,
            unknownDto,
            null,
            null,
            await workflowService.GetSummaryAsync(id, cancellationToken),
            await workflowService.GetRecentScansAsync(id, cancellationToken: cancellationToken)));
    }

    private async Task<ScanResponse> ApplyItemScanAsync(
        Shipment shipment,
        ShipmentItem item,
        string barcode,
        int quantity,
        string? employeeName,
        string? boxNumber,
        string actionType,
        CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        item.ScannedQuantity += quantity;
        item.LastScannedAt = DateTime.UtcNow;
        ShipmentWorkflowService.UpdateItemStatus(item);

        shipment.Status = ShipmentStatuses.Scanning;
        shipment.CurrentBoxNumber = boxNumber ?? shipment.CurrentBoxNumber;

        if (!string.IsNullOrWhiteSpace(boxNumber))
        {
            await EnsureBoxAsync(shipment.Id, boxNumber, cancellationToken);
        }

        context.ScanHistory.Add(new ScanHistory
        {
            ShipmentId = shipment.Id,
            ShipmentItemId = item.Id,
            Barcode = barcode,
            ProductName = item.ProductName,
            SKU = item.SKU,
            QuantityAdded = quantity,
            ScanTime = DateTime.UtcNow,
            EmployeeName = employeeName,
            ActionType = actionType,
            BoxNumber = boxNumber
        });

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var outcome = item.ScannedQuantity > item.ExpectedQuantity ? ScanOutcomes.Extra : ScanOutcomes.Matched;
        return new ScanResponse(
            outcome,
            outcome == ScanOutcomes.Extra ? $"{item.ProductName} scanned extra quantity." : $"{item.ProductName} matched.",
            ShipmentWorkflowService.ToDto(item),
            null,
            null,
            null,
            await workflowService.GetSummaryAsync(shipment.Id, cancellationToken),
            await workflowService.GetRecentScansAsync(shipment.Id, cancellationToken: cancellationToken));
    }

    private async Task<ScanResponse> ApplyUnknownScanAsync(
        Shipment shipment,
        string barcode,
        int quantity,
        string? employeeName,
        string? boxNumber,
        CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var unknown = await context.UnknownItems
            .FirstOrDefaultAsync(item => item.ShipmentId == shipment.Id && item.Barcode == barcode && item.ResolvedAt == null, cancellationToken);

        if (unknown is null)
        {
            unknown = new UnknownItem
            {
                ShipmentId = shipment.Id,
                Barcode = barcode,
                ScannedQuantity = quantity,
                FirstScannedAt = now,
                LastScannedAt = now
            };
            context.UnknownItems.Add(unknown);
        }
        else
        {
            unknown.ScannedQuantity += quantity;
            unknown.LastScannedAt = now;
        }

        shipment.Status = ShipmentStatuses.Scanning;
        shipment.CurrentBoxNumber = boxNumber ?? shipment.CurrentBoxNumber;

        if (!string.IsNullOrWhiteSpace(boxNumber))
        {
            await EnsureBoxAsync(shipment.Id, boxNumber, cancellationToken);
        }

        context.ScanHistory.Add(new ScanHistory
        {
            ShipmentId = shipment.Id,
            Barcode = barcode,
            QuantityAdded = quantity,
            ScanTime = now,
            EmployeeName = employeeName,
            ActionType = "Unknown",
            BoxNumber = boxNumber
        });

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new ScanResponse(
            ScanOutcomes.Unknown,
            $"Barcode {barcode} not found in this shipment. Logged as unknown.",
            null,
            new UnknownItemDto(unknown.Id, unknown.Barcode, unknown.ScannedQuantity, unknown.FirstScannedAt, unknown.LastScannedAt),
            null,
            null,
            await workflowService.GetSummaryAsync(shipment.Id, cancellationToken),
            await workflowService.GetRecentScansAsync(shipment.Id, cancellationToken: cancellationToken));
    }

    private async Task<List<ShipmentItem>> FindSkuMatchesAsync(
        int shipmentId,
        string barcode,
        CancellationToken cancellationToken)
    {
        var items = await context.ShipmentItems
            .Where(item => item.ShipmentId == shipmentId && item.SKU != "")
            .ToListAsync(cancellationToken);

        return items
            .Where(item =>
                item.SKU.Equals(barcode, StringComparison.OrdinalIgnoreCase) ||
                (item.SKU.Length >= 4 && barcode.Contains(item.SKU, StringComparison.OrdinalIgnoreCase)))
            .ToList();
    }

    private async Task EnsureBoxAsync(int shipmentId, string boxNumber, CancellationToken cancellationToken)
    {
        var exists = await context.ShipmentBoxes
            .AnyAsync(box => box.ShipmentId == shipmentId && box.BoxNumber == boxNumber, cancellationToken);

        if (!exists)
        {
            context.ShipmentBoxes.Add(new ShipmentBox
            {
                ShipmentId = shipmentId,
                BoxNumber = boxNumber
            });
        }
    }

    private async Task<ShipmentDetailDto?> ToDetailAsync(int id, CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (shipment is null)
        {
            return null;
        }

        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == id)
            .OrderBy(item => item.BoxNumber)
            .ThenBy(item => item.ProductName)
            .ToListAsync(cancellationToken);

        var summary = await workflowService.GetSummaryAsync(id, cancellationToken);

        return new ShipmentDetailDto(
            shipment.Id,
            shipment.Name,
            shipment.OrderNumber,
            shipment.OrderReference,
            shipment.StoreName,
            shipment.StoreCode,
            shipment.SupplierName,
            shipment.CreatedAt,
            shipment.CompletedAt,
            shipment.Status,
            shipment.Notes,
            shipment.CurrentBoxNumber,
            summary,
            items.Select(ShipmentWorkflowService.ToDto).ToList());
    }

    private async Task<ShipmentCompletionDto?> BuildCompletionAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (shipment is null)
        {
            return null;
        }

        var summary = await workflowService.GetSummaryAsync(id, cancellationToken);
        var boxes = await workflowService.GetBoxesAsync(id, cancellationToken);
        var completedBoxes = boxes.Count(box => box.IsComplete);
        var allBoxesComplete = boxes.Count == 0 || completedBoxes == boxes.Count;
        var hasDiscrepancies = summary.MissingUnits > 0 || summary.ExtraUnits > 0 || summary.UnknownUnits > 0;
        var hasImportedProducts = summary.TotalItems > 0;

        return new ShipmentCompletionDto(
            shipment.Id,
            shipment.Status,
            hasImportedProducts,
            boxes.Count,
            completedBoxes,
            allBoxesComplete,
            hasDiscrepancies,
            hasImportedProducts && allBoxesComplete,
            summary);
    }

    private async Task<IReadOnlyList<ShipmentListItemDto>> ToListItemsAsync(
        IReadOnlyList<Shipment> shipments,
        CancellationToken cancellationToken)
    {
        var result = new List<ShipmentListItemDto>();
        foreach (var shipment in shipments)
        {
            var summary = await workflowService.GetSummaryAsync(shipment.Id, cancellationToken);
            result.Add(new ShipmentListItemDto(
                shipment.Id,
                shipment.Name,
                shipment.OrderReference,
                shipment.StoreName,
                shipment.CreatedAt,
                shipment.CompletedAt,
                shipment.Status,
                summary.TotalExpected,
                summary.TotalScanned,
                summary.MissingUnits,
                summary.ExtraUnits,
                summary.UnknownUnits));
        }

        return result;
    }
}
