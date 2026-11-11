namespace ShipmentCheckerPro.Api.Models;

public sealed record CreateShipmentRequest(
    string Name,
    string? OrderNumber,
    string? OrderReference,
    string? StoreName,
    string? StoreCode,
    string? SupplierName,
    string? Notes,
    string? CreatedBy);

public sealed record ShipmentListItemDto(
    int Id,
    string Name,
    string? OrderReference,
    string? StoreName,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    string Status,
    int TotalExpected,
    int TotalScanned,
    int MissingUnits,
    int ExtraUnits,
    int UnknownUnits);

public sealed record ShipmentDetailDto(
    int Id,
    string Name,
    string? OrderNumber,
    string? OrderReference,
    string? StoreName,
    string? StoreCode,
    string? SupplierName,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    string Status,
    string? Notes,
    string? CurrentBoxNumber,
    ShipmentSummaryDto Summary,
    IReadOnlyList<ShipmentItemDto> Items);

public sealed record ShipmentItemDto(
    int Id,
    string? BoxNumber,
    string? ChineseProductName,
    string ProductName,
    string SKU,
    string Barcode,
    int ExpectedQuantity,
    int ScannedQuantity,
    string MainSection,
    string Category,
    string SubCategory,
    string Status,
    string ConfidenceFlag,
    DateTime? LastScannedAt,
    string? Notes);

public sealed record ShipmentSummaryDto(
    int TotalItems,
    int TotalExpected,
    int TotalScanned,
    int MatchedUnits,
    int MissingUnits,
    int ExtraUnits,
    int UnknownUnits,
    decimal MatchRate);

public sealed record ImportSummaryDto(
    int ShipmentId,
    int RowsImported,
    int RowsRejected,
    int WarningCount,
    int TotalProductsInShipment,
    int TotalExpectedQuantityInShipment,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings);

public sealed record ScanRequest(
    string Barcode,
    string? EmployeeName,
    string? BoxNumber,
    int Quantity,
    int? ConfirmShipmentItemId,
    bool ConfirmLogUnknown);

public sealed record ScanResponse(
    string Outcome,
    string Message,
    ShipmentItemDto? Item,
    UnknownItemDto? UnknownItem,
    ShipmentItemDto? SuggestedItem,
    ProductCatalogSuggestionDto? CatalogSuggestion,
    ShipmentSummaryDto Summary,
    IReadOnlyList<ScanHistoryDto> RecentScans);

public sealed record UnknownItemDto(
    int Id,
    string Barcode,
    int ScannedQuantity,
    DateTime FirstScannedAt,
    DateTime LastScannedAt);

public sealed record ProductCatalogSuggestionDto(
    string Barcode,
    string? SKU,
    string ProductName,
    string MainSection,
    string Category,
    string SubCategory);

public sealed record ScanHistoryDto(
    int Id,
    string Barcode,
    string? ProductName,
    string? SKU,
    int QuantityAdded,
    DateTime ScanTime,
    string? EmployeeName,
    string ActionType,
    string? BoxNumber,
    bool WasUndo);

public sealed record BoxProgressDto(
    int Id,
    string BoxNumber,
    int ExpectedQuantity,
    int ScannedQuantity,
    int MatchedQuantity,
    int MissingQuantity,
    int ExtraQuantity,
    bool IsComplete,
    DateTime? CompletedAt);

public sealed record UpdateCurrentBoxRequest(string BoxNumber);

public sealed record CreateBoxRequest(string BoxNumber);

public sealed record CompleteBoxRequest(string? EmployeeName);

public sealed record CompleteShipmentRequest(
    string? EmployeeName,
    bool AcknowledgeDiscrepancies);

public sealed record ShipmentCompletionDto(
    int ShipmentId,
    string Status,
    bool HasImportedProducts,
    int TotalBoxes,
    int CompletedBoxes,
    bool AllBoxesComplete,
    bool HasDiscrepancies,
    bool CanComplete,
    ShipmentSummaryDto Summary);
