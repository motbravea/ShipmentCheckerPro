using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public class ShipmentExportService(
    ShipmentCheckerDbContext context,
    ShipmentWorkflowService workflowService)
{
    public async Task<ShipmentExportFile?> BuildShipmentWorkbookAsync(int shipmentId, CancellationToken cancellationToken)
    {
        var shipment = await context.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return null;
        }

        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == shipmentId)
            .OrderBy(item => item.BoxNumber)
            .ThenBy(item => item.ProductName)
            .ToListAsync(cancellationToken);

        var unknownItems = await context.UnknownItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == shipmentId && item.ResolvedAt == null)
            .OrderByDescending(item => item.LastScannedAt)
            .ToListAsync(cancellationToken);

        var scanHistory = await context.ScanHistory
            .AsNoTracking()
            .Where(scan => scan.ShipmentId == shipmentId)
            .OrderByDescending(scan => scan.ScanTime)
            .ToListAsync(cancellationToken);

        var summary = await workflowService.GetSummaryAsync(shipmentId, cancellationToken);
        var boxes = await workflowService.GetBoxesAsync(shipmentId, cancellationToken);

        using var workbook = new XLWorkbook();
        AddSummarySheet(workbook, shipment, summary);
        AddBoxesSheet(workbook, boxes);
        AddItemsSheet(workbook, items);
        AddDiscrepanciesSheet(workbook, items, unknownItems);
        AddScanHistorySheet(workbook, scanHistory);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return new ShipmentExportFile(
            BuildFileName(shipment),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            stream.ToArray());
    }

    private static void AddSummarySheet(XLWorkbook workbook, Shipment shipment, ShipmentSummaryDto summary)
    {
        var sheet = workbook.Worksheets.Add("Summary");
        var rows = new (string Label, object? Value)[]
        {
            ("Shipment", shipment.Name),
            ("Order Number", shipment.OrderNumber),
            ("Order Reference", shipment.OrderReference),
            ("Store", shipment.StoreName),
            ("Supplier", shipment.SupplierName),
            ("Status", shipment.Status),
            ("Created At", shipment.CreatedAt),
            ("Completed At", shipment.CompletedAt),
            ("Products Imported", summary.TotalItems),
            ("Expected Units", summary.TotalExpected),
            ("Scanned Units", summary.TotalScanned),
            ("Matched Units", summary.MatchedUnits),
            ("Missing Units", summary.MissingUnits),
            ("Extra Units", summary.ExtraUnits),
            ("Unknown Units", summary.UnknownUnits),
            ("Match Rate", $"{summary.MatchRate}%")
        };

        sheet.Cell(1, 1).Value = "Metric";
        sheet.Cell(1, 2).Value = "Value";
        StyleHeader(sheet.Range(1, 1, 1, 2));

        for (var index = 0; index < rows.Length; index++)
        {
            sheet.Cell(index + 2, 1).Value = rows[index].Label;
            SetCellValue(sheet.Cell(index + 2, 2), rows[index].Value);
        }

        sheet.Columns().AdjustToContents();
    }

    private static void AddBoxesSheet(XLWorkbook workbook, IReadOnlyList<BoxProgressDto> boxes)
    {
        var sheet = workbook.Worksheets.Add("Boxes");
        var headers = new[] { "Box", "Expected", "Scanned", "Matched", "Missing", "Extra", "Status", "Completed At" };
        AddHeaders(sheet, headers);

        for (var index = 0; index < boxes.Count; index++)
        {
            var box = boxes[index];
            var row = index + 2;
            sheet.Cell(row, 1).Value = box.BoxNumber;
            sheet.Cell(row, 2).Value = box.ExpectedQuantity;
            sheet.Cell(row, 3).Value = box.ScannedQuantity;
            sheet.Cell(row, 4).Value = box.MatchedQuantity;
            sheet.Cell(row, 5).Value = box.MissingQuantity;
            sheet.Cell(row, 6).Value = box.ExtraQuantity;
            sheet.Cell(row, 7).Value = box.IsComplete ? "Complete" : "Open";
            SetCellValue(sheet.Cell(row, 8), box.CompletedAt);
        }

        sheet.Columns().AdjustToContents();
    }

    private static void AddItemsSheet(XLWorkbook workbook, IReadOnlyList<ShipmentItem> items)
    {
        var sheet = workbook.Worksheets.Add("Products");
        var headers = new[]
        {
            "Box", "Product", "Chinese Product Name", "SKU", "Barcode", "MainSection", "Category",
            "SubCategory", "Expected", "Scanned", "Difference", "Status", "Confidence", "Last Scanned At"
        };
        AddHeaders(sheet, headers);

        for (var index = 0; index < items.Count; index++)
        {
            var item = items[index];
            var row = index + 2;
            sheet.Cell(row, 1).Value = item.BoxNumber;
            sheet.Cell(row, 2).Value = item.ProductName;
            sheet.Cell(row, 3).Value = item.ChineseProductName;
            sheet.Cell(row, 4).Value = item.SKU;
            sheet.Cell(row, 5).Value = item.Barcode;
            sheet.Cell(row, 6).Value = item.MainSection;
            sheet.Cell(row, 7).Value = item.Category;
            sheet.Cell(row, 8).Value = item.SubCategory;
            sheet.Cell(row, 9).Value = item.ExpectedQuantity;
            sheet.Cell(row, 10).Value = item.ScannedQuantity;
            sheet.Cell(row, 11).Value = item.ScannedQuantity - item.ExpectedQuantity;
            sheet.Cell(row, 12).Value = item.Status;
            sheet.Cell(row, 13).Value = item.ConfidenceFlag;
            SetCellValue(sheet.Cell(row, 14), item.LastScannedAt);
        }

        sheet.Columns().AdjustToContents();
    }

    private static void AddDiscrepanciesSheet(
        XLWorkbook workbook,
        IReadOnlyList<ShipmentItem> items,
        IReadOnlyList<UnknownItem> unknownItems)
    {
        var sheet = workbook.Worksheets.Add("Discrepancies");
        var headers = new[]
        {
            "Type", "Box", "Product/Barcode", "SKU", "MainSection", "Expected", "Scanned", "Difference", "Status", "Last Seen"
        };
        AddHeaders(sheet, headers);

        var row = 2;
        foreach (var item in items.Where(item => item.Status != ItemStatuses.Matched))
        {
            sheet.Cell(row, 1).Value = item.Status == ItemStatuses.Extra ? "Extra" : "Missing";
            sheet.Cell(row, 2).Value = item.BoxNumber;
            sheet.Cell(row, 3).Value = item.ProductName;
            sheet.Cell(row, 4).Value = item.SKU;
            sheet.Cell(row, 5).Value = item.MainSection;
            sheet.Cell(row, 6).Value = item.ExpectedQuantity;
            sheet.Cell(row, 7).Value = item.ScannedQuantity;
            sheet.Cell(row, 8).Value = item.ScannedQuantity - item.ExpectedQuantity;
            sheet.Cell(row, 9).Value = item.Status;
            SetCellValue(sheet.Cell(row, 10), item.LastScannedAt);
            row++;
        }

        foreach (var item in unknownItems)
        {
            sheet.Cell(row, 1).Value = "Unknown";
            sheet.Cell(row, 3).Value = item.Barcode;
            sheet.Cell(row, 7).Value = item.ScannedQuantity;
            sheet.Cell(row, 8).Value = item.ScannedQuantity;
            sheet.Cell(row, 9).Value = "Unknown";
            sheet.Cell(row, 10).Value = item.LastScannedAt;
            row++;
        }

        sheet.Columns().AdjustToContents();
    }

    private static void AddScanHistorySheet(XLWorkbook workbook, IReadOnlyList<ScanHistory> scanHistory)
    {
        var sheet = workbook.Worksheets.Add("Scan History");
        var headers = new[]
        {
            "Scan Time", "Action", "Box", "Barcode", "Product", "SKU", "Quantity", "Employee", "Was Undo"
        };
        AddHeaders(sheet, headers);

        for (var index = 0; index < scanHistory.Count; index++)
        {
            var scan = scanHistory[index];
            var row = index + 2;
            sheet.Cell(row, 1).Value = scan.ScanTime;
            sheet.Cell(row, 2).Value = scan.ActionType;
            sheet.Cell(row, 3).Value = scan.BoxNumber;
            sheet.Cell(row, 4).Value = scan.Barcode;
            sheet.Cell(row, 5).Value = scan.ProductName;
            sheet.Cell(row, 6).Value = scan.SKU;
            sheet.Cell(row, 7).Value = scan.QuantityAdded;
            sheet.Cell(row, 8).Value = scan.EmployeeName;
            sheet.Cell(row, 9).Value = scan.WasUndo ? "Yes" : "No";
        }

        sheet.Columns().AdjustToContents();
    }

    private static void AddHeaders(IXLWorksheet sheet, IReadOnlyList<string> headers)
    {
        for (var index = 0; index < headers.Count; index++)
        {
            sheet.Cell(1, index + 1).Value = headers[index];
        }

        StyleHeader(sheet.Range(1, 1, 1, headers.Count));
    }

    private static void StyleHeader(IXLRange range)
    {
        range.Style.Font.Bold = true;
        range.Style.Font.FontColor = XLColor.White;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
    }

    private static void SetCellValue(IXLCell cell, object? value)
    {
        switch (value)
        {
            case null:
                cell.Value = string.Empty;
                break;
            case DateTime dateTime:
                cell.Value = dateTime;
                cell.Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
                break;
            default:
                cell.Value = XLCellValue.FromObject(value);
                break;
        }
    }

    private static string BuildFileName(Shipment shipment)
    {
        var name = string.IsNullOrWhiteSpace(shipment.OrderReference) ? shipment.Name : shipment.OrderReference;
        var cleanName = string.Join("_", name.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));
        return $"ShipmentCheckerPro_{cleanName}_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";
    }
}

public sealed record ShipmentExportFile(string FileName, string ContentType, byte[] Content);
