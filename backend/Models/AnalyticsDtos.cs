namespace ShipmentCheckerPro.Api.Models;

public sealed record MonthlyAnalyticsDto(
    string Month,
    int TotalUnitsReceived,
    int CompletedShipments,
    double AverageMatchRate,
    int ActiveTesters,
    int ChronicProblemProducts,
    int TesterLosses,
    int UnknownUnits,
    int ManualAdjustments,
    int TesterAuditMissedUnits,
    IReadOnlyList<SectionAnalyticsDto> Sections,
    IReadOnlyList<ShipmentAccuracyDto> ShipmentAccuracy,
    IReadOnlyList<DiscrepancyBreakdownDto> Discrepancies,
    IReadOnlyList<ProductAnalyticsDto> TopProducts,
    IReadOnlyList<ChronicProductDto> ChronicProducts,
    IReadOnlyList<TesterStatusAnalyticsDto> TesterStatuses);

public sealed record SectionAnalyticsDto(
    string MainSection,
    string Category,
    string SubCategory,
    int ProductCount,
    int ExpectedUnits,
    int ReceivedUnits,
    int MissingUnits,
    int ExtraUnits,
    double DiscrepancyRate);

public sealed record ShipmentAccuracyDto(
    int ShipmentId,
    string ShipmentName,
    DateTime Date,
    int ExpectedUnits,
    int ReceivedUnits,
    int MissingUnits,
    int ExtraUnits,
    int UnknownUnits,
    double MatchRate);

public sealed record DiscrepancyBreakdownDto(string Type, int Units);

public sealed record ProductAnalyticsDto(
    string Barcode,
    string? SKU,
    string ProductName,
    string MainSection,
    string Category,
    string SubCategory,
    int ReceivedUnits);

public sealed record ChronicProductDto(
    string Barcode,
    string? SKU,
    string ProductName,
    string MainSection,
    int MissingOccurrences,
    int ExtraOccurrences,
    string Trend);

public sealed record TesterStatusAnalyticsDto(string Status, int Units);
