namespace ShipmentCheckerPro.Api.Models;

public sealed record SectionRuleDto(
    int Id,
    string Keyword,
    string MainSection,
    string Category,
    string SubCategory,
    int Priority,
    bool IsActive,
    DateTime CreatedAt,
    string? CreatedBy);

public sealed record UpsertSectionRuleRequest(
    string Keyword,
    string MainSection,
    string Category,
    string SubCategory,
    int Priority,
    bool IsActive,
    string? CreatedBy);

public sealed record TestClassificationRequest(string ProductName, string? ProductType);

public sealed record ClassificationResult(
    string MainSection,
    string Category,
    string SubCategory,
    int? MatchedRuleId,
    string? MatchedKeyword);

public sealed record ReorderSectionRuleRequest(int Id, int Priority);
