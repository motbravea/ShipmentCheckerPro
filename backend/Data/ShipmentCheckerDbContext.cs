using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Data;

public class ShipmentCheckerDbContext(DbContextOptions<ShipmentCheckerDbContext> options) : DbContext(options)
{
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentBox> ShipmentBoxes => Set<ShipmentBox>();
    public DbSet<ShipmentItem> ShipmentItems => Set<ShipmentItem>();
    public DbSet<ScanHistory> ScanHistory => Set<ScanHistory>();
    public DbSet<UnknownItem> UnknownItems => Set<UnknownItem>();
    public DbSet<Tester> Testers => Set<Tester>();
    public DbSet<TesterHistory> TesterHistory => Set<TesterHistory>();
    public DbSet<TesterAuditSession> TesterAuditSessions => Set<TesterAuditSession>();
    public DbSet<TesterAuditResult> TesterAuditResults => Set<TesterAuditResult>();
    public DbSet<ProductCatalog> ProductCatalog => Set<ProductCatalog>();
    public DbSet<InventorySnapshot> InventorySnapshots => Set<InventorySnapshot>();
    public DbSet<ManualAdjustment> ManualAdjustments => Set<ManualAdjustment>();
    public DbSet<SectionRule> SectionRules => Set<SectionRule>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<ShipmentPhoto> ShipmentPhotos => Set<ShipmentPhoto>();
    public DbSet<POSSalesData> POSSalesData => Set<POSSalesData>();
    public DbSet<StoreSetting> StoreSettings => Set<StoreSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppSetting>().HasKey(setting => setting.Key);

        modelBuilder.Entity<Employee>()
            .HasIndex(employee => employee.Name)
            .IsUnique();

        modelBuilder.Entity<ProductCatalog>()
            .HasIndex(product => product.Barcode)
            .IsUnique();

        modelBuilder.Entity<ShipmentItem>()
            .HasIndex(item => new { item.ShipmentId, item.Barcode });

        modelBuilder.Entity<ShipmentBox>()
            .HasIndex(box => new { box.ShipmentId, box.BoxNumber })
            .IsUnique();

        modelBuilder.Entity<SectionRule>()
            .HasIndex(rule => new { rule.Keyword, rule.MainSection, rule.Category, rule.SubCategory })
            .IsUnique();

        modelBuilder.Entity<SectionRule>()
            .HasIndex(rule => new { rule.IsActive, rule.Priority });

        modelBuilder.Entity<StoreSetting>()
            .Property(setting => setting.AllowCloudSync)
            .HasDefaultValue(false);
    }
}
