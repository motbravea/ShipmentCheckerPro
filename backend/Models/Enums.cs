namespace ShipmentCheckerPro.Api.Models;

public static class Roles
{
    public const string Employee = "Employee";
    public const string Manager = "Manager";
}

public static class ShipmentStatuses
{
    public const string Draft = "Draft";
    public const string Imported = "Imported";
    public const string Scanning = "Scanning";
    public const string Completed = "Completed";
    public const string Archived = "Archived";
}

public static class ItemStatuses
{
    public const string Missing = "Missing";
    public const string Matched = "Matched";
    public const string Extra = "Extra";
    public const string Unknown = "Unknown";
    public const string InProgress = "In Progress";
}

public static class TesterStatuses
{
    public const string PendingApproval = "Pending Approval";
    public const string Active = "Active";
    public const string Inactive = "Inactive";
    public const string Stolen = "Stolen";
    public const string Damaged = "Damaged";
    public const string Lost = "Lost";
    public const string Replaced = "Replaced";
}

public static class ClassificationDefaults
{
    public const string Uncategorized = "Uncategorized";
}

public static class ScanOutcomes
{
    public const string Matched = "Matched";
    public const string Extra = "Extra";
    public const string Unknown = "Unknown";
    public const string SkuSuggestion = "SkuSuggestion";
    public const string CatalogSuggestion = "CatalogSuggestion";
    public const string Error = "Error";
}
