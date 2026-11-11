using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Data;

public static class DatabaseInitializer
{
    public const string InitialManagerPinEnvironmentVariable = "SHIPMENTCHECKER_INITIAL_MANAGER_PIN";

    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShipmentCheckerDbContext>();

        Directory.CreateDirectory(AppDataPaths.Root);
        Directory.CreateDirectory(AppDataPaths.PhotosPath);

        await context.Database.MigrateAsync();
        await context.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");

        await SeedDefaultsAsync(context);
    }

    private static async Task SeedDefaultsAsync(ShipmentCheckerDbContext context)
    {
        if (!await context.Employees.AnyAsync())
        {
            var initialPin = Environment.GetEnvironmentVariable(InitialManagerPinEnvironmentVariable);
            if (string.IsNullOrWhiteSpace(initialPin) ||
                initialPin.Length is < 4 or > 12 || !initialPin.All(char.IsAsciiDigit))
            {
                throw new InvalidOperationException(
                    "Set SHIPMENTCHECKER_INITIAL_MANAGER_PIN to your own 4-12 digit PIN before the first start. " +
                    "This initializes only the local demo manager account; no shared PIN is included in the source.");
            }

            context.Employees.Add(new Employee
            {
                Name = "Demo Manager",
                PIN = initialPin,
                Role = Roles.Manager,
                IsActive = true
            });
        }

        await SeedSectionRulesAsync(context);

        if (!await context.StoreSettings.AnyAsync())
        {
            context.StoreSettings.Add(new StoreSetting());
        }

        if (!await context.AppSettings.AnyAsync(setting => setting.Key == "Theme"))
        {
            context.AppSettings.Add(new AppSetting { Key = "Theme", Value = "dark" });
        }

        await context.SaveChangesAsync();
    }

    private static SectionRule Rule(
        string keyword,
        string mainSection,
        string category,
        string subCategory,
        int priority,
        DateTime now) => new()
    {
        Keyword = keyword,
        MainSection = mainSection,
        Category = category,
        SubCategory = subCategory,
        Priority = priority,
        CreatedBy = "System",
        CreatedAt = now,
        IsActive = true
    };

    private static async Task SeedSectionRulesAsync(ShipmentCheckerDbContext context)
    {
        var now = DateTime.UtcNow;
        var defaults = new[]
        {
            Rule("collectible, figurine", "Collectibles", "Figures", "General", 10, now),
            Rule("lipstick, makeup", "Beauty", "Makeup", "General", 20, now),
            Rule("skincare, cream, mask", "Beauty", "Skincare", "General", 30, now),
            Rule("wireless earphone, wireless earphones, headphones", "Electronics", "Audio", "General", 40, now),
            Rule("charger, cable, adapter", "Electronics", "Charging", "General", 50, now),
            Rule("notebook", "Stationery", "Paper Products", "Notebook", 60, now),
            Rule("pen, eraser, ruler", "Stationery", "Writing", "General", 70, now),
            Rule("plush, doll", "Toys", "Plush", "General", 80, now),
            Rule("toy, puzzle", "Toys", "Games", "General", 90, now),
            Rule("bottle, cup, mug, flask, tumbler", "Lifestyle", "Drinkware", "General", 100, now),
            Rule("snack, candy, chocolate, food", "Food", "Snacks", "General", 110, now),
            Rule("bag, pouch, backpack, wallet", "Bags", "Carry", "General", 120, now)
        };

        foreach (var rule in defaults)
        {
            var exists = await context.SectionRules.AnyAsync(existing =>
                existing.Keyword == rule.Keyword &&
                existing.MainSection == rule.MainSection &&
                existing.Category == rule.Category &&
                existing.SubCategory == rule.SubCategory);

            if (!exists)
            {
                context.SectionRules.Add(rule);
            }
        }
    }
}
