namespace ShipmentCheckerPro.Api.Models;

public sealed record TesterListItemDto(
    int Id,
    string TesterCode,
    string ProductName,
    string? SKU,
    string Barcode,
    string MainSection,
    string Category,
    string SubCategory,
    int Quantity,
    string Status,
    DateTime CreatedAt,
    DateTime? LastSeenAt,
    DateTime? LastAuditAt,
    int MissedAuditCount);

public sealed record TesterHistoryDto(
    int Id,
    string? OldStatus,
    string NewStatus,
    DateTime ChangedAt,
    string? ChangedBy,
    string Reason,
    string? Notes);

public sealed record TesterDetailDto(
    int Id,
    string TesterCode,
    string ProductName,
    string? ChineseProductName,
    string? SKU,
    string Barcode,
    string MainSection,
    string Category,
    string SubCategory,
    int Quantity,
    string Status,
    DateTime CreatedAt,
    string? CreatedBy,
    string? ApprovedBy,
    DateTime? LastSeenAt,
    DateTime? LastStatusChangeAt,
    DateTime? LastAuditAt,
    int MissedAuditCount,
    string? Notes,
    string? PhotoPath,
    IReadOnlyList<TesterHistoryDto> History);

public sealed record CreateTesterRequest(
    string TesterCode,
    string Barcode,
    string? ProductName,
    string? ChineseProductName,
    string? SKU,
    int Quantity,
    string? Notes,
    string? CreatedBy);

public sealed record UpdateTesterStatusRequest(
    string Status,
    string? ChangedBy,
    string Reason,
    string? Notes);

public sealed record ApproveTesterRequest(string? ApprovedBy);

public sealed record ProductLookupDto(
    string Barcode,
    string? SKU,
    string ProductName,
    string? ChineseProductName,
    string MainSection,
    string Category,
    string SubCategory);

public sealed record TesterAuditListItemDto(
    int Id,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? CreatedBy,
    int TotalExpected,
    int TotalScanned,
    int TotalMissed,
    string? Notes);

public sealed record TesterAuditResultDto(
    int TesterId,
    string TesterCode,
    string ProductName,
    string Barcode,
    int Quantity,
    bool WasFound,
    DateTime? ScannedAt,
    string? Notes);

public sealed record TesterAuditDetailDto(
    int Id,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? CreatedBy,
    int TotalExpected,
    int TotalScanned,
    int TotalMissed,
    string? Notes,
    IReadOnlyList<TesterAuditResultDto> Results);

public sealed record StartTesterAuditRequest(string? CreatedBy, string? Notes);

public sealed record ScanTesterAuditRequest(string Code, string? EmployeeName);
