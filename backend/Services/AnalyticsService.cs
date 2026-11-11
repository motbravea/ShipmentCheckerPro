using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public class AnalyticsService(ShipmentCheckerDbContext context)
{
    public async Task<MonthlyAnalyticsDto> BuildMonthlyAsync(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var shipments = await context.Shipments
            .AsNoTracking()
            .Where(shipment =>
                (shipment.CompletedAt ?? shipment.CreatedAt) >= start &&
                (shipment.CompletedAt ?? shipment.CreatedAt) < end)
            .OrderBy(shipment => shipment.CompletedAt ?? shipment.CreatedAt)
            .ToListAsync(cancellationToken);

        var shipmentIds = shipments.Select(shipment => shipment.Id).ToHashSet();
        var items = shipmentIds.Count == 0
            ? []
            : await context.ShipmentItems
                .AsNoTracking()
                .Where(item => shipmentIds.Contains(item.ShipmentId))
                .ToListAsync(cancellationToken);

        var unknownItems = shipmentIds.Count == 0
            ? []
            : await context.UnknownItems
                .AsNoTracking()
                .Where(item => shipmentIds.Contains(item.ShipmentId) && item.FirstScannedAt >= start && item.FirstScannedAt < end)
                .ToListAsync(cancellationToken);

        var allHistoricalItems = await (
            from item in context.ShipmentItems.AsNoTracking()
            join shipment in context.Shipments.AsNoTracking() on item.ShipmentId equals shipment.Id
            where (shipment.Status == ShipmentStatuses.Completed || shipment.IsArchived) &&
                  (item.Status == ItemStatuses.Missing || item.Status == ItemStatuses.Extra || item.Status == ItemStatuses.InProgress)
            select item)
            .ToListAsync(cancellationToken);

        var testers = await context.Testers
            .AsNoTracking()
            .Select(tester => new { tester.Status, tester.Quantity })
            .ToListAsync(cancellationToken);
        var activeTesters = testers
            .Where(tester => tester.Status == TesterStatuses.Active)
            .Sum(tester => tester.Quantity);
        var testerStatuses = testers
            .GroupBy(tester => tester.Status)
            .Select(group => new TesterStatusAnalyticsDto(group.Key, group.Sum(tester => tester.Quantity)))
            .OrderByDescending(group => group.Units)
            .ToList();

        var testerLosses = await context.TesterHistory
            .AsNoTracking()
            .Where(history =>
                history.ChangedAt >= start &&
                history.ChangedAt < end &&
                (history.NewStatus == TesterStatuses.Stolen ||
                 history.NewStatus == TesterStatuses.Damaged ||
                 history.NewStatus == TesterStatuses.Lost))
            .CountAsync(cancellationToken);

        var testerAuditMissedUnits = await context.TesterAuditSessions
            .AsNoTracking()
            .Where(session => session.CompletedAt >= start && session.CompletedAt < end)
            .SumAsync(session => (int?)session.TotalMissed, cancellationToken) ?? 0;

        var manualAdjustments = await context.ManualAdjustments
            .AsNoTracking()
            .CountAsync(adjustment => adjustment.ChangedAt >= start && adjustment.ChangedAt < end, cancellationToken);

        var sectionRows = items
            .GroupBy(item => new { item.MainSection, item.Category, item.SubCategory })
            .Select(group =>
            {
                var expected = group.Sum(item => item.ExpectedQuantity);
                var received = group.Sum(item => item.ScannedQuantity);
                var missing = group.Sum(item => Math.Max(0, item.ExpectedQuantity - item.ScannedQuantity));
                var extra = group.Sum(item => Math.Max(0, item.ScannedQuantity - item.ExpectedQuantity));
                return new SectionAnalyticsDto(
                    group.Key.MainSection,
                    group.Key.Category,
                    group.Key.SubCategory,
                    group.Count(),
                    expected,
                    received,
                    missing,
                    extra,
                    expected == 0 ? 0 : Math.Round((missing + extra) * 100d / expected, 1));
            })
            .OrderByDescending(row => row.ReceivedUnits)
            .ThenBy(row => row.MainSection)
            .ToList();

        var shipmentAccuracy = shipments.Select(shipment =>
        {
            var shipmentItems = items.Where(item => item.ShipmentId == shipment.Id).ToList();
            var expected = shipmentItems.Sum(item => item.ExpectedQuantity);
            var received = shipmentItems.Sum(item => item.ScannedQuantity);
            var missing = shipmentItems.Sum(item => Math.Max(0, item.ExpectedQuantity - item.ScannedQuantity));
            var extra = shipmentItems.Sum(item => Math.Max(0, item.ScannedQuantity - item.ExpectedQuantity));
            var unknown = unknownItems.Where(item => item.ShipmentId == shipment.Id).Sum(item => item.ScannedQuantity);
            var matched = shipmentItems.Sum(item => Math.Min(item.ExpectedQuantity, item.ScannedQuantity));

            return new ShipmentAccuracyDto(
                shipment.Id,
                shipment.Name,
                shipment.CompletedAt ?? shipment.CreatedAt,
                expected,
                received,
                missing,
                extra,
                unknown,
                expected == 0 ? 0 : Math.Round(matched * 100d / expected, 1));
        }).ToList();

        var chronicProducts = allHistoricalItems
            .GroupBy(item => item.Barcode)
            .Select(group =>
            {
                var latest = group.OrderByDescending(item => item.Id).First();
                var missing = group.Count(item => item.ScannedQuantity < item.ExpectedQuantity);
                var extra = group.Count(item => item.ScannedQuantity > item.ExpectedQuantity);
                return new ChronicProductDto(
                    latest.Barcode,
                    latest.SKU,
                    latest.ProductName,
                    latest.MainSection,
                    missing,
                    extra,
                    missing >= 3 && missing >= extra ? "Chronic missing" :
                    extra >= 3 ? "Chronic extra" : "Watch");
            })
            .Where(product => product.MissingOccurrences >= 3 || product.ExtraOccurrences >= 3)
            .OrderByDescending(product => product.MissingOccurrences + product.ExtraOccurrences)
            .ThenBy(product => product.ProductName)
            .Take(20)
            .ToList();

        var topProducts = items
            .GroupBy(item => item.Barcode)
            .Select(group =>
            {
                var latest = group.OrderByDescending(item => item.Id).First();
                return new ProductAnalyticsDto(
                    latest.Barcode,
                    latest.SKU,
                    latest.ProductName,
                    latest.MainSection,
                    latest.Category,
                    latest.SubCategory,
                    group.Sum(item => item.ScannedQuantity));
            })
            .Where(product => product.ReceivedUnits > 0)
            .OrderByDescending(product => product.ReceivedUnits)
            .ThenBy(product => product.ProductName)
            .Take(10)
            .ToList();

        var totalExpected = items.Sum(item => item.ExpectedQuantity);
        var totalReceived = items.Sum(item => item.ScannedQuantity);
        var totalMissing = items.Sum(item => Math.Max(0, item.ExpectedQuantity - item.ScannedQuantity));
        var totalExtra = items.Sum(item => Math.Max(0, item.ScannedQuantity - item.ExpectedQuantity));
        var totalUnknown = unknownItems.Sum(item => item.ScannedQuantity);

        return new MonthlyAnalyticsDto(
            start.ToString("yyyy-MM"),
            totalReceived,
            shipments.Count(shipment => shipment.Status == ShipmentStatuses.Completed || shipment.IsArchived),
            shipmentAccuracy.Count == 0 ? 0 : Math.Round(shipmentAccuracy.Average(shipment => shipment.MatchRate), 1),
            activeTesters,
            chronicProducts.Count,
            testerLosses,
            totalUnknown,
            manualAdjustments,
            testerAuditMissedUnits,
            sectionRows,
            shipmentAccuracy,
            [
                new("Missing", totalMissing),
                new("Extra", totalExtra),
                new("Unknown", totalUnknown)
            ],
            topProducts,
            chronicProducts,
            testerStatuses);
    }
}
