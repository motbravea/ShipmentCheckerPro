using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public class ShipmentWorkflowService(ShipmentCheckerDbContext context)
{
    public async Task<ShipmentSummaryDto> GetSummaryAsync(int shipmentId, CancellationToken cancellationToken = default)
    {
        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == shipmentId)
            .ToListAsync(cancellationToken);

        var unknownUnits = await context.UnknownItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == shipmentId && item.ResolvedAt == null)
            .SumAsync(item => item.ScannedQuantity, cancellationToken);

        return BuildSummary(items, unknownUnits);
    }

    public async Task<IReadOnlyList<ScanHistoryDto>> GetRecentScansAsync(
        int shipmentId,
        int count = 10,
        CancellationToken cancellationToken = default)
    {
        return await context.ScanHistory
            .AsNoTracking()
            .Where(scan => scan.ShipmentId == shipmentId)
            .OrderByDescending(scan => scan.ScanTime)
            .Take(count)
            .Select(scan => new ScanHistoryDto(
                scan.Id,
                scan.Barcode,
                scan.ProductName,
                scan.SKU,
                scan.QuantityAdded,
                scan.ScanTime,
                scan.EmployeeName,
                scan.ActionType,
                scan.BoxNumber,
                scan.WasUndo))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BoxProgressDto>> GetBoxesAsync(int shipmentId, CancellationToken cancellationToken = default)
    {
        var boxes = await context.ShipmentBoxes
            .AsNoTracking()
            .Where(box => box.ShipmentId == shipmentId)
            .ToListAsync(cancellationToken);

        var items = await context.ShipmentItems
            .AsNoTracking()
            .Where(item => item.ShipmentId == shipmentId)
            .ToListAsync(cancellationToken);

        var activeScans = await context.ScanHistory
            .AsNoTracking()
            .Where(scan => scan.ShipmentId == shipmentId && scan.BoxNumber != null && scan.ActionType != "Undo" && !scan.WasUndo)
            .ToListAsync(cancellationToken);

        var boxNumbers = boxes
            .Select(box => box.BoxNumber)
            .Concat(items.Where(item => !string.IsNullOrWhiteSpace(item.BoxNumber)).Select(item => item.BoxNumber!))
            .Concat(activeScans.Select(scan => scan.BoxNumber!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(boxNumber => boxNumber, BoxNumberComparer.Instance)
            .ToList();

        return boxNumbers.Select(boxNumber =>
        {
            var box = boxes.FirstOrDefault(candidate => candidate.BoxNumber.Equals(boxNumber, StringComparison.OrdinalIgnoreCase));
            var boxItems = items.Where(item => string.Equals(item.BoxNumber, boxNumber, StringComparison.OrdinalIgnoreCase)).ToList();
            var boxScans = activeScans.Where(scan => string.Equals(scan.BoxNumber, boxNumber, StringComparison.OrdinalIgnoreCase)).ToList();
            var expected = boxItems.Sum(item => item.ExpectedQuantity);
            var scanned = boxScans.Sum(scan => scan.QuantityAdded);
            var matched = Math.Min(expected, scanned);
            var extra = Math.Max(0, scanned - expected);
            var missing = Math.Max(0, expected - scanned);

            return new BoxProgressDto(
                box?.Id ?? 0,
                boxNumber,
                expected,
                scanned,
                matched,
                missing,
                extra,
                box?.IsComplete ?? false,
                box?.CompletedAt);
        }).ToList();
    }

    public static ShipmentSummaryDto BuildSummary(IReadOnlyList<ShipmentItem> items, int unknownUnits)
    {
        var totalExpected = items.Sum(item => item.ExpectedQuantity);
        var totalScanned = items.Sum(item => item.ScannedQuantity);
        var matched = items.Sum(item => Math.Min(item.ExpectedQuantity, item.ScannedQuantity));
        var missing = items.Sum(item => Math.Max(0, item.ExpectedQuantity - item.ScannedQuantity));
        var extra = items.Sum(item => Math.Max(0, item.ScannedQuantity - item.ExpectedQuantity));
        var matchRate = totalExpected == 0 ? 0 : Math.Round((decimal)matched / totalExpected * 100, 2);

        return new ShipmentSummaryDto(
            items.Count,
            totalExpected,
            totalScanned,
            matched,
            missing,
            extra,
            unknownUnits,
            matchRate);
    }

    public static ShipmentItemDto ToDto(ShipmentItem item)
    {
        return new ShipmentItemDto(
            item.Id,
            item.BoxNumber,
            item.ChineseProductName,
            item.ProductName,
            item.SKU,
            item.Barcode,
            item.ExpectedQuantity,
            item.ScannedQuantity,
            item.MainSection,
            item.Category,
            item.SubCategory,
            item.Status,
            item.ConfidenceFlag,
            item.LastScannedAt,
            item.Notes);
    }

    public static void UpdateItemStatus(ShipmentItem item)
    {
        if (item.ScannedQuantity == item.ExpectedQuantity)
        {
            item.Status = ItemStatuses.Matched;
        }
        else if (item.ScannedQuantity > item.ExpectedQuantity)
        {
            item.Status = ItemStatuses.Extra;
        }
        else if (item.ScannedQuantity > 0)
        {
            item.Status = ItemStatuses.InProgress;
        }
        else
        {
            item.Status = ItemStatuses.Missing;
        }
    }

    private sealed class BoxNumberComparer : IComparer<string>
    {
        public static readonly BoxNumberComparer Instance = new();

        public int Compare(string? left, string? right)
        {
            if (int.TryParse(left, out var leftNumber) && int.TryParse(right, out var rightNumber))
            {
                return leftNumber.CompareTo(rightNumber);
            }

            return string.Compare(left, right, StringComparison.OrdinalIgnoreCase);
        }
    }
}
