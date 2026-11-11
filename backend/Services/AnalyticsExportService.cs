using ClosedXML.Excel;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public class AnalyticsExportService(AnalyticsService analyticsService)
{
    public async Task<ShipmentExportFile> BuildMonthlyWorkbookAsync(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var analytics = await analyticsService.BuildMonthlyAsync(year, month, cancellationToken);
        using var workbook = new XLWorkbook();

        AddOverview(workbook, analytics);
        AddSections(workbook, analytics.Sections);
        AddShipments(workbook, analytics.ShipmentAccuracy);
        AddProducts(workbook, analytics.TopProducts);
        AddChronicProducts(workbook, analytics.ChronicProducts);
        AddTesterStatuses(workbook, analytics.TesterStatuses);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return new ShipmentExportFile(
            $"ShipmentCheckerPro_Analytics_{analytics.Month}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            stream.ToArray());
    }

    private static void AddOverview(XLWorkbook workbook, MonthlyAnalyticsDto data)
    {
        var sheet = workbook.Worksheets.Add("Overview");
        AddHeaders(sheet, ["Metric", "Value"]);
        var rows = new (string Label, object Value)[]
        {
            ("Month", data.Month),
            ("Units received", data.TotalUnitsReceived),
            ("Completed shipments", data.CompletedShipments),
            ("Average match rate", data.AverageMatchRate / 100),
            ("Active tester units", data.ActiveTesters),
            ("Chronic problem products", data.ChronicProblemProducts),
            ("Tester losses", data.TesterLosses),
            ("Tester audit missed units", data.TesterAuditMissedUnits),
            ("Unknown units", data.UnknownUnits),
            ("Manual adjustments", data.ManualAdjustments)
        };

        for (var index = 0; index < rows.Length; index++)
        {
            sheet.Cell(index + 2, 1).Value = rows[index].Label;
            sheet.Cell(index + 2, 2).Value = XLCellValue.FromObject(rows[index].Value);
        }
        sheet.Cell(5, 2).Style.NumberFormat.Format = "0.0%";
        Finish(sheet);
    }

    private static void AddSections(XLWorkbook workbook, IReadOnlyList<SectionAnalyticsDto> rows)
    {
        var sheet = workbook.Worksheets.Add("Sections");
        AddHeaders(sheet, ["MainSection", "Category", "SubCategory", "Products", "Expected", "Received", "Missing", "Extra", "Discrepancy Rate"]);
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            var line = index + 2;
            sheet.Cell(line, 1).Value = row.MainSection;
            sheet.Cell(line, 2).Value = row.Category;
            sheet.Cell(line, 3).Value = row.SubCategory;
            sheet.Cell(line, 4).Value = row.ProductCount;
            sheet.Cell(line, 5).Value = row.ExpectedUnits;
            sheet.Cell(line, 6).Value = row.ReceivedUnits;
            sheet.Cell(line, 7).Value = row.MissingUnits;
            sheet.Cell(line, 8).Value = row.ExtraUnits;
            sheet.Cell(line, 9).Value = row.DiscrepancyRate / 100;
            sheet.Cell(line, 9).Style.NumberFormat.Format = "0.0%";
        }
        Finish(sheet);
    }

    private static void AddShipments(XLWorkbook workbook, IReadOnlyList<ShipmentAccuracyDto> rows)
    {
        var sheet = workbook.Worksheets.Add("Shipment Accuracy");
        AddHeaders(sheet, ["Shipment", "Date", "Expected", "Received", "Missing", "Extra", "Unknown", "Match Rate"]);
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            var line = index + 2;
            sheet.Cell(line, 1).Value = row.ShipmentName;
            sheet.Cell(line, 2).Value = row.Date;
            sheet.Cell(line, 2).Style.DateFormat.Format = "yyyy-mm-dd";
            sheet.Cell(line, 3).Value = row.ExpectedUnits;
            sheet.Cell(line, 4).Value = row.ReceivedUnits;
            sheet.Cell(line, 5).Value = row.MissingUnits;
            sheet.Cell(line, 6).Value = row.ExtraUnits;
            sheet.Cell(line, 7).Value = row.UnknownUnits;
            sheet.Cell(line, 8).Value = row.MatchRate / 100;
            sheet.Cell(line, 8).Style.NumberFormat.Format = "0.0%";
        }
        Finish(sheet);
    }

    private static void AddProducts(XLWorkbook workbook, IReadOnlyList<ProductAnalyticsDto> rows)
    {
        var sheet = workbook.Worksheets.Add("Top Products");
        AddHeaders(sheet, ["Product", "SKU", "Barcode", "MainSection", "Category", "SubCategory", "Received"]);
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            var line = index + 2;
            sheet.Cell(line, 1).Value = row.ProductName;
            sheet.Cell(line, 2).Value = row.SKU;
            sheet.Cell(line, 3).Value = row.Barcode;
            sheet.Cell(line, 4).Value = row.MainSection;
            sheet.Cell(line, 5).Value = row.Category;
            sheet.Cell(line, 6).Value = row.SubCategory;
            sheet.Cell(line, 7).Value = row.ReceivedUnits;
        }
        Finish(sheet);
    }

    private static void AddChronicProducts(XLWorkbook workbook, IReadOnlyList<ChronicProductDto> rows)
    {
        var sheet = workbook.Worksheets.Add("Chronic Problems");
        AddHeaders(sheet, ["Product", "SKU", "Barcode", "MainSection", "Missing Occurrences", "Extra Occurrences", "Trend"]);
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            var line = index + 2;
            sheet.Cell(line, 1).Value = row.ProductName;
            sheet.Cell(line, 2).Value = row.SKU;
            sheet.Cell(line, 3).Value = row.Barcode;
            sheet.Cell(line, 4).Value = row.MainSection;
            sheet.Cell(line, 5).Value = row.MissingOccurrences;
            sheet.Cell(line, 6).Value = row.ExtraOccurrences;
            sheet.Cell(line, 7).Value = row.Trend;
        }
        Finish(sheet);
    }

    private static void AddTesterStatuses(XLWorkbook workbook, IReadOnlyList<TesterStatusAnalyticsDto> rows)
    {
        var sheet = workbook.Worksheets.Add("Tester Status");
        AddHeaders(sheet, ["Status", "Units"]);
        for (var index = 0; index < rows.Count; index++)
        {
            sheet.Cell(index + 2, 1).Value = rows[index].Status;
            sheet.Cell(index + 2, 2).Value = rows[index].Units;
        }
        Finish(sheet);
    }

    private static void AddHeaders(IXLWorksheet sheet, IReadOnlyList<string> headers)
    {
        for (var index = 0; index < headers.Count; index++) sheet.Cell(1, index + 1).Value = headers[index];
        var range = sheet.Range(1, 1, 1, headers.Count);
        range.Style.Font.Bold = true;
        range.Style.Font.FontColor = XLColor.White;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
    }

    private static void Finish(IXLWorksheet sheet)
    {
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();
        sheet.RangeUsed()?.SetAutoFilter();
    }
}
