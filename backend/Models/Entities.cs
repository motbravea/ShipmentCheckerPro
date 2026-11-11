namespace ShipmentCheckerPro.Api.Models;

public class Shipment
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? OrderNumber { get; set; }
    public string? OrderReference { get; set; }
    public string? StoreName { get; set; }
    public string? StoreCode { get; set; }
    public string? SupplierName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = ShipmentStatuses.Draft;
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
    public string? CompletedBy { get; set; }
    public bool IsArchived { get; set; }
    public string? CurrentBoxNumber { get; set; }
    public ICollection<ShipmentItem> Items { get; set; } = [];
    public ICollection<ShipmentBox> Boxes { get; set; } = [];
}

public class ShipmentBox
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public Shipment? Shipment { get; set; }
    public string BoxNumber { get; set; } = string.Empty;
    public bool IsComplete { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletedBy { get; set; }
}

public class ShipmentItem
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public Shipment? Shipment { get; set; }
    public string? OrderNumber { get; set; }
    public string? OrderReference { get; set; }
    public string? BoxNumber { get; set; }
    public string? ChineseProductName { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public int ExpectedQuantity { get; set; }
    public int ScannedQuantity { get; set; }
    public string MainSection { get; set; } = ClassificationDefaults.Uncategorized;
    public string Category { get; set; } = ClassificationDefaults.Uncategorized;
    public string SubCategory { get; set; } = ClassificationDefaults.Uncategorized;
    public string Status { get; set; } = ItemStatuses.Missing;
    public string ConfidenceFlag { get; set; } = "normal";
    public DateTime? LastScannedAt { get; set; }
    public string? Notes { get; set; }
    public bool HasPhoto { get; set; }
}

public class ScanHistory
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public int? ShipmentItemId { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? SKU { get; set; }
    public int QuantityAdded { get; set; }
    public DateTime ScanTime { get; set; } = DateTime.UtcNow;
    public string? EmployeeName { get; set; }
    public string ActionType { get; set; } = "Scan";
    public string? BoxNumber { get; set; }
    public string? Notes { get; set; }
    public bool WasUndo { get; set; }
}

public class UnknownItem
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public int ScannedQuantity { get; set; }
    public DateTime FirstScannedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastScannedAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedBy { get; set; }
}

public class Tester
{
    public int Id { get; set; }
    public string TesterCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ChineseProductName { get; set; }
    public string? SKU { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public string MainSection { get; set; } = ClassificationDefaults.Uncategorized;
    public string Category { get; set; } = ClassificationDefaults.Uncategorized;
    public string SubCategory { get; set; } = ClassificationDefaults.Uncategorized;
    public int Quantity { get; set; }
    public string Status { get; set; } = TesterStatuses.PendingApproval;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public DateTime? LastStatusChangeAt { get; set; }
    public DateTime? LastAuditAt { get; set; }
    public int MissedAuditCount { get; set; }
    public string? Notes { get; set; }
    public string? PhotoPath { get; set; }
}

public class TesterHistory
{
    public int Id { get; set; }
    public int TesterId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? ChangedBy { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class TesterAuditSession
{
    public int Id { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? CreatedBy { get; set; }
    public int TotalExpected { get; set; }
    public int TotalScanned { get; set; }
    public int TotalMissed { get; set; }
    public string? Notes { get; set; }
}

public class TesterAuditResult
{
    public int Id { get; set; }
    public int AuditSessionId { get; set; }
    public int TesterId { get; set; }
    public bool WasFound { get; set; }
    public DateTime? ScannedAt { get; set; }
    public string? Notes { get; set; }
}

public class ProductCatalog
{
    public int Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ChineseProductName { get; set; }
    public string? SKU { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public string MainSection { get; set; } = ClassificationDefaults.Uncategorized;
    public string Category { get; set; } = ClassificationDefaults.Uncategorized;
    public string SubCategory { get; set; } = ClassificationDefaults.Uncategorized;
    public DateTime FirstReceivedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastReceivedAt { get; set; } = DateTime.UtcNow;
    public int TotalReceivedQuantity { get; set; }
    public int ChronicMissingCount { get; set; }
    public int ChronicExtraCount { get; set; }
}

public class InventorySnapshot
{
    public int Id { get; set; }
    public DateOnly SnapshotDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public int ProductCatalogId { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string MainSection { get; set; } = ClassificationDefaults.Uncategorized;
    public string Category { get; set; } = ClassificationDefaults.Uncategorized;
    public string SubCategory { get; set; } = ClassificationDefaults.Uncategorized;
    public int EstimatedOnHand { get; set; }
    public int TotalReceived { get; set; }
    public int TotalAdjusted { get; set; }
    public int TotalTesters { get; set; }
    public string? Notes { get; set; }
}

public class ManualAdjustment
{
    public int Id { get; set; }
    public int? ShipmentId { get; set; }
    public int? ShipmentItemId { get; set; }
    public int OldQuantity { get; set; }
    public int NewQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? PhotoPath { get; set; }
}

public class SectionRule
{
    public int Id { get; set; }
    public string Keyword { get; set; } = string.Empty;
    public string MainSection { get; set; } = ClassificationDefaults.Uncategorized;
    public string Category { get; set; } = ClassificationDefaults.Uncategorized;
    public string SubCategory { get; set; } = ClassificationDefaults.Uncategorized;
    public int Priority { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PIN { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.Employee;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AppSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ShipmentPhoto
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public int? ShipmentItemId { get; set; }
    public string PhotoPath { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? UploadedBy { get; set; }
}

public class POSSalesData
{
    public int Id { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public string? SKU { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public DateTime SaleDate { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
}

public class StoreSetting
{
    public int Id { get; set; }
    public string StoreName { get; set; } = "Local Store";
    public string? StoreCode { get; set; }
    public bool AllowCloudSync { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
