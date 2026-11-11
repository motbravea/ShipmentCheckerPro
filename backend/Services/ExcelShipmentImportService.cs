using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public class ExcelShipmentImportService(
    ShipmentCheckerDbContext context,
    IProductClassificationService classificationService)
{
    private static readonly Dictionary<string, string[]> HeaderAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OrderNumber"] = ["\u8ba2\u5355\u53f7", "Order Number", "OrderNumber"],
        ["OrderReference"] = ["\u8ba2\u5355\u53c2\u8003\u53f7", "Order Reference", "OrderReference", "Reference"],
        ["StoreName"] = ["\u5e97\u94fa\u540d\u79f0", "Store Name", "StoreName"],
        ["BoxNumber"] = ["\u7bb1\u5e8f\u53f7", "Box Number", "BoxNumber", "Box"],
        ["ChineseProductName"] = ["\u5546\u54c1\u4e2d\u6587\u540d\u79f0", "Chinese Product Name", "ChineseProductName"],
        ["ProductName"] = ["Item Description", "Product Name", "Description", "English Name", "ProductName"],
        ["SKU"] = ["SKU", "Item No", "Product Code", "Item Number"],
        ["Barcode"] = ["Barcode", "QR", "EAN", "UPC", "Barcode No"],
        ["ExpectedQuantity"] = ["\u6570\u91cf", "Quantity", "Expected Qty", "Shipped Qty", "Qty"]
    };

    public async Task<ImportSummaryDto> ImportAsync(
        Shipment shipment,
        IFormFile file,
        string? employeeName,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            throw new InvalidOperationException("This file is empty.");
        }

        await using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.FirstOrDefault(sheet => sheet.Name.Equals("Sheet1", StringComparison.OrdinalIgnoreCase));

        if (worksheet is null)
        {
            throw new InvalidOperationException("This file doesn't match the expected format. Check that Sheet1 exists and columns are in the right order.");
        }

        var headerMap = BuildHeaderMap(worksheet);

        if (!headerMap.ContainsKey("Barcode"))
        {
            throw new InvalidOperationException("No barcode column found. Supported headers: Barcode, QR, EAN, UPC.");
        }

        if (!headerMap.ContainsKey("ExpectedQuantity"))
        {
            throw new InvalidOperationException("No quantity column found. Supported headers: Quantity, Expected Qty, Shipped Qty, Qty.");
        }

        var rows = new Dictionary<string, ShipmentItemDraft>(StringComparer.OrdinalIgnoreCase);
        var errors = new List<string>();
        var warnings = new List<string>();
        var rowCount = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (var rowNumber = 2; rowNumber <= rowCount; rowNumber++)
        {
            var barcode = GetValue(worksheet, rowNumber, headerMap, "Barcode");
            if (string.IsNullOrWhiteSpace(barcode))
            {
                errors.Add($"Row {rowNumber} skipped: barcode is empty.");
                continue;
            }

            var quantityText = GetValue(worksheet, rowNumber, headerMap, "ExpectedQuantity");
            if (!TryParseWholeQuantity(quantityText, out var expectedQuantity))
            {
                errors.Add($"Row {rowNumber} skipped: quantity '{quantityText}' is not a valid number.");
                continue;
            }

            if (rows.TryGetValue(barcode, out var existing))
            {
                existing.ExpectedQuantity += expectedQuantity;
                warnings.Add($"Duplicate barcode {barcode} found - quantities combined. Review before continuing.");
                continue;
            }

            rows[barcode] = new ShipmentItemDraft(
                GetValue(worksheet, rowNumber, headerMap, "OrderNumber"),
                GetValue(worksheet, rowNumber, headerMap, "OrderReference"),
                GetValue(worksheet, rowNumber, headerMap, "StoreName"),
                GetValue(worksheet, rowNumber, headerMap, "BoxNumber"),
                GetValue(worksheet, rowNumber, headerMap, "ChineseProductName"),
                GetValue(worksheet, rowNumber, headerMap, "ProductName"),
                GetValue(worksheet, rowNumber, headerMap, "SKU"),
                barcode,
                expectedQuantity);
        }

        if (await context.ScanHistory.AnyAsync(scan => scan.ShipmentId == shipment.Id, cancellationToken))
        {
            throw new InvalidOperationException("This shipment already has scan history. Create a new shipment before importing a different file.");
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        shipment.Status = ShipmentStatuses.Imported;
        shipment.CreatedBy ??= employeeName;

        var firstRow = rows.Values.FirstOrDefault();
        if (firstRow is not null)
        {
            shipment.OrderNumber = string.IsNullOrWhiteSpace(shipment.OrderNumber) ? firstRow.OrderNumber : shipment.OrderNumber;
            shipment.OrderReference = string.IsNullOrWhiteSpace(shipment.OrderReference) ? firstRow.OrderReference : shipment.OrderReference;
            shipment.StoreName = string.IsNullOrWhiteSpace(shipment.StoreName) ? firstRow.StoreName : shipment.StoreName;
        }

        var boxes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var draft in rows.Values)
        {
            var productName = string.IsNullOrWhiteSpace(draft.ProductName)
                ? draft.ChineseProductName ?? draft.Barcode
                : draft.ProductName.Trim();
            var classification = await classificationService.ClassifyAsync(productName, null, cancellationToken);

            var item = new ShipmentItem
            {
                ShipmentId = shipment.Id,
                OrderNumber = draft.OrderNumber,
                OrderReference = draft.OrderReference,
                BoxNumber = draft.BoxNumber,
                ChineseProductName = draft.ChineseProductName,
                ProductName = productName,
                SKU = draft.SKU ?? string.Empty,
                Barcode = draft.Barcode,
                ExpectedQuantity = draft.ExpectedQuantity,
                ScannedQuantity = 0,
                Status = ItemStatuses.Missing,
                MainSection = classification.MainSection,
                Category = classification.Category,
                SubCategory = classification.SubCategory,
                ConfidenceFlag = "normal"
            };

            var existingItem = await context.ShipmentItems
                .FirstOrDefaultAsync(candidate => candidate.ShipmentId == shipment.Id && candidate.Barcode == draft.Barcode, cancellationToken);

            if (existingItem is null)
            {
                context.ShipmentItems.Add(item);
            }
            else
            {
                existingItem.ExpectedQuantity += draft.ExpectedQuantity;
                existingItem.OrderNumber = string.IsNullOrWhiteSpace(existingItem.OrderNumber) ? draft.OrderNumber : existingItem.OrderNumber;
                existingItem.OrderReference = string.IsNullOrWhiteSpace(existingItem.OrderReference) ? draft.OrderReference : existingItem.OrderReference;
                existingItem.BoxNumber = string.IsNullOrWhiteSpace(existingItem.BoxNumber) ? draft.BoxNumber : existingItem.BoxNumber;
                existingItem.ChineseProductName = string.IsNullOrWhiteSpace(existingItem.ChineseProductName) ? draft.ChineseProductName : existingItem.ChineseProductName;
                existingItem.ProductName = productName;
                existingItem.SKU = string.IsNullOrWhiteSpace(draft.SKU) ? existingItem.SKU : draft.SKU;
                existingItem.MainSection = classification.MainSection;
                existingItem.Category = classification.Category;
                existingItem.SubCategory = classification.SubCategory;
                ShipmentWorkflowService.UpdateItemStatus(existingItem);
                warnings.Add($"Barcode {draft.Barcode} already existed in this shipment - imported quantity was added.");
            }

            if (!string.IsNullOrWhiteSpace(draft.BoxNumber))
            {
                boxes.Add(draft.BoxNumber.Trim());
            }

            await UpsertCatalogAsync(draft, productName, classification, cancellationToken);
        }

        foreach (var boxNumber in boxes.OrderBy(value => value))
        {
            context.ShipmentBoxes.Add(new ShipmentBox
            {
                ShipmentId = shipment.Id,
                BoxNumber = boxNumber
            });
        }

        if (string.IsNullOrWhiteSpace(shipment.CurrentBoxNumber))
        {
            shipment.CurrentBoxNumber = boxes.OrderBy(value => value).FirstOrDefault();
        }

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var totalProducts = await context.ShipmentItems
            .CountAsync(item => item.ShipmentId == shipment.Id, cancellationToken);
        var totalExpectedQuantity = await context.ShipmentItems
            .Where(item => item.ShipmentId == shipment.Id)
            .SumAsync(item => item.ExpectedQuantity, cancellationToken);

        return new ImportSummaryDto(
            shipment.Id,
            rows.Count,
            errors.Count,
            warnings.Count,
            totalProducts,
            totalExpectedQuantity,
            errors,
            warnings.Distinct().ToList());
    }

    private async Task UpsertCatalogAsync(
        ShipmentItemDraft draft,
        string productName,
        ClassificationResult classification,
        CancellationToken cancellationToken)
    {
        var catalog = await context.ProductCatalog
            .FirstOrDefaultAsync(product => product.Barcode == draft.Barcode, cancellationToken);

        if (catalog is null)
        {
            context.ProductCatalog.Add(new ProductCatalog
            {
                Barcode = draft.Barcode,
                SKU = draft.SKU,
                ProductName = productName,
                ChineseProductName = draft.ChineseProductName,
                MainSection = classification.MainSection,
                Category = classification.Category,
                SubCategory = classification.SubCategory,
                FirstReceivedAt = DateTime.UtcNow,
                LastReceivedAt = DateTime.UtcNow,
                TotalReceivedQuantity = draft.ExpectedQuantity
            });
            return;
        }

        catalog.SKU = string.IsNullOrWhiteSpace(draft.SKU) ? catalog.SKU : draft.SKU;
        catalog.ProductName = productName;
        catalog.ChineseProductName = draft.ChineseProductName;
        catalog.MainSection = classification.MainSection;
        catalog.Category = classification.Category;
        catalog.SubCategory = classification.SubCategory;
        catalog.LastReceivedAt = DateTime.UtcNow;
        catalog.TotalReceivedQuantity += draft.ExpectedQuantity;
    }

    private static Dictionary<string, int> BuildHeaderMap(IXLWorksheet worksheet)
    {
        var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lastColumn = worksheet.Row(1).LastCellUsed()?.Address.ColumnNumber ?? 0;

        for (var column = 1; column <= lastColumn; column++)
        {
            var header = NormalizeHeader(worksheet.Cell(1, column).GetString());
            if (string.IsNullOrWhiteSpace(header))
            {
                continue;
            }

            foreach (var alias in HeaderAliases)
            {
                if (alias.Value.Any(candidate => NormalizeHeader(candidate) == header))
                {
                    headerMap.TryAdd(alias.Key, column);
                }
            }
        }

        return headerMap;
    }

    private static string? GetValue(
        IXLWorksheet worksheet,
        int rowNumber,
        IReadOnlyDictionary<string, int> headerMap,
        string key)
    {
        if (!headerMap.TryGetValue(key, out var columnNumber))
        {
            return null;
        }

        var cell = worksheet.Cell(rowNumber, columnNumber);
        var value = cell.DataType == XLDataType.Text ? cell.GetText() : cell.GetFormattedString();
        return value?.Trim();
    }

    private static string NormalizeHeader(string value)
    {
        return new string(value.Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
    }

    private static bool TryParseWholeQuantity(string? value, out int quantity)
    {
        quantity = 0;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.All(char.IsDigit) && int.TryParse(trimmed, NumberStyles.None, CultureInfo.InvariantCulture, out quantity))
        {
            return quantity > 0;
        }

        var decimalCandidate = trimmed
            .Replace(" ", string.Empty)
            .Replace("\u00a0", string.Empty)
            .Replace(',', '.');

        if (!decimal.TryParse(decimalCandidate, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalQuantity))
        {
            return false;
        }

        if (decimalQuantity <= 0 || decimalQuantity != Math.Truncate(decimalQuantity) || decimalQuantity > int.MaxValue)
        {
            return false;
        }

        quantity = (int)decimalQuantity;
        return true;
    }

    private sealed record ShipmentItemDraft(
        string? OrderNumber,
        string? OrderReference,
        string? StoreName,
        string? BoxNumber,
        string? ChineseProductName,
        string? ProductName,
        string? SKU,
        string Barcode,
        int ExpectedQuantity)
    {
        public int ExpectedQuantity { get; set; } = ExpectedQuantity;
    }
}
