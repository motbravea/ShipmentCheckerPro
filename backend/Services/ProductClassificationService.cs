using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Services;

public interface IProductClassificationService
{
    Task<ClassificationResult> ClassifyAsync(string productName, string? productType = null, CancellationToken cancellationToken = default);
}

public partial class ProductClassificationService(ShipmentCheckerDbContext context) : IProductClassificationService
{
    public async Task<ClassificationResult> ClassifyAsync(
        string productName,
        string? productType = null,
        CancellationToken cancellationToken = default)
    {
        var searchText = Normalize($"{productName} {productType}");
        var rules = await context.SectionRules
            .AsNoTracking()
            .Where(rule => rule.IsActive)
            .OrderBy(rule => rule.Priority)
            .ThenBy(rule => rule.Id)
            .ToListAsync(cancellationToken);

        foreach (var rule in rules)
        {
            var matchedKeyword = SplitKeywords(rule.Keyword)
                .FirstOrDefault(keyword => IsMatch(searchText, keyword));

            if (matchedKeyword is not null)
            {
                return new ClassificationResult(
                    Clean(rule.MainSection, ClassificationDefaults.Uncategorized),
                    Clean(rule.Category, ClassificationDefaults.Uncategorized),
                    Clean(rule.SubCategory, ClassificationDefaults.Uncategorized),
                    rule.Id,
                    matchedKeyword);
            }
        }

        return new ClassificationResult(
            ClassificationDefaults.Uncategorized,
            ClassificationDefaults.Uncategorized,
            Clean(productType ?? productName, ClassificationDefaults.Uncategorized),
            null,
            null);
    }

    private static IEnumerable<string> SplitKeywords(string keywords)
    {
        return keywords
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Normalize)
            .Where(keyword => keyword.Length > 0);
    }

    private static bool IsMatch(string searchText, string keyword)
    {
        if (keyword.Contains(' '))
        {
            return searchText.Contains(keyword, StringComparison.OrdinalIgnoreCase);
        }

        return Regex.IsMatch(searchText, $@"(^|\s){Regex.Escape(keyword)}(\s|$)", RegexOptions.IgnoreCase);
    }

    private static string Normalize(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        return NonWordCharacters().Replace(lower, " ").Trim();
    }

    private static string Clean(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    [GeneratedRegex(@"[^\p{L}\p{N}]+")]
    private static partial Regex NonWordCharacters();
}
