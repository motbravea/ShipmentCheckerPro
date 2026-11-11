using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShipmentCheckerPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class ProductClassificationHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SectionRules_Keyword_Section",
                table: "SectionRules");

            migrationBuilder.RenameColumn(
                name: "Section",
                table: "SectionRules",
                newName: "SubCategory");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Testers",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "MainSection",
                table: "Testers",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "Testers",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ShipmentItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "MainSection",
                table: "ShipmentItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "ShipmentItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "SectionRules",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "MainSection",
                table: "SectionRules",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ProductCatalog",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "MainSection",
                table: "ProductCatalog",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "ProductCatalog",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "InventorySnapshots",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "MainSection",
                table: "InventorySnapshots",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "InventorySnapshots",
                type: "TEXT",
                nullable: false,
                defaultValue: "Uncategorized");

            migrationBuilder.Sql("""
                UPDATE Testers
                SET MainSection = COALESCE(NULLIF(Section, ''), 'Uncategorized'),
                    Category = 'Uncategorized',
                    SubCategory = COALESCE(NULLIF(ProductName, ''), 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE ShipmentItems
                SET MainSection = COALESCE(NULLIF(Section, ''), 'Uncategorized'),
                    Category = 'Uncategorized',
                    SubCategory = COALESCE(NULLIF(ProductName, ''), 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE ProductCatalog
                SET MainSection = COALESCE(NULLIF(Section, ''), 'Uncategorized'),
                    Category = 'Uncategorized',
                    SubCategory = COALESCE(NULLIF(ProductName, ''), 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE InventorySnapshots
                SET MainSection = COALESCE(NULLIF(Section, ''), 'Uncategorized'),
                    Category = 'Uncategorized',
                    SubCategory = COALESCE(NULLIF(ProductName, ''), 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE SectionRules
                SET MainSection = COALESCE(NULLIF(SubCategory, ''), 'Uncategorized'),
                    Category = 'General',
                    SubCategory = 'General'
                """);

            migrationBuilder.Sql("""
                UPDATE SectionRules
                SET IsActive = 0
                WHERE CreatedBy = 'System'
                  AND Category = 'General'
                  AND SubCategory = 'General'
                  AND Keyword IN (
                    'toy, plush, figure, blind box, doll',
                    'beauty, makeup, lipstick, cream, skincare',
                    'pen, notebook, stationery, eraser, ruler',
                    'bottle, cup, mug, flask, tumbler',
                    'snack, candy, chocolate, food',
                    'bag, pouch, backpack, wallet',
                    'phone, cable, charger, earphone',
                    'character, cartoon, collectible'
                  )
                """);

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Testers");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "ShipmentItems");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "ProductCatalog");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "InventorySnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_SectionRules_IsActive_Priority",
                table: "SectionRules",
                columns: new[] { "IsActive", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_SectionRules_Keyword_MainSection_Category_SubCategory",
                table: "SectionRules",
                columns: new[] { "Keyword", "MainSection", "Category", "SubCategory" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SectionRules_IsActive_Priority",
                table: "SectionRules");

            migrationBuilder.DropIndex(
                name: "IX_SectionRules_Keyword_MainSection_Category_SubCategory",
                table: "SectionRules");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Testers");

            migrationBuilder.DropColumn(
                name: "MainSection",
                table: "Testers");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "Testers");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ShipmentItems");

            migrationBuilder.DropColumn(
                name: "MainSection",
                table: "ShipmentItems");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "ShipmentItems");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "SectionRules");

            migrationBuilder.DropColumn(
                name: "MainSection",
                table: "SectionRules");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ProductCatalog");

            migrationBuilder.DropColumn(
                name: "MainSection",
                table: "ProductCatalog");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "ProductCatalog");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "InventorySnapshots");

            migrationBuilder.DropColumn(
                name: "MainSection",
                table: "InventorySnapshots");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "InventorySnapshots");

            migrationBuilder.RenameColumn(
                name: "SubCategory",
                table: "SectionRules",
                newName: "Section");

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Testers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "ShipmentItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "ProductCatalog",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "InventorySnapshots",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE Testers
                SET Section = NULLIF(MainSection, 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE ShipmentItems
                SET Section = NULLIF(MainSection, 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE ProductCatalog
                SET Section = NULLIF(MainSection, 'Uncategorized')
                """);

            migrationBuilder.Sql("""
                UPDATE InventorySnapshots
                SET Section = NULLIF(MainSection, 'Uncategorized')
                """);

            migrationBuilder.CreateIndex(
                name: "IX_SectionRules_Keyword_Section",
                table: "SectionRules",
                columns: new[] { "Keyword", "Section" },
                unique: true);
        }
    }
}
