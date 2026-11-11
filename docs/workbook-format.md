# Shipment workbook format

Create an `.xlsx` workbook with a worksheet named **Sheet1** and headers on row **1**. The importer reads named columns, so recognized columns can be reordered. It ignores spaces and punctuation when comparing header text.

At minimum, include a barcode and a positive whole-number expected quantity. Product names, SKU, box, and order fields make receiving and reporting more useful.

| Field | Recognized English headers |
| --- | --- |
| Barcode | `Barcode`, `QR`, `EAN`, `UPC`, `Barcode No` |
| Expected quantity | `Quantity`, `Expected Qty`, `Shipped Qty`, `Qty` |
| Product name | `Item Description`, `Product Name`, `Description`, `English Name`, `ProductName` |
| SKU | `SKU`, `Item No`, `Product Code`, `Item Number` |
| Box | `Box Number`, `BoxNumber`, `Box` |
| Order number | `Order Number`, `OrderNumber` |
| Order reference | `Order Reference`, `OrderReference`, `Reference` |
| Store name | `Store Name`, `StoreName` |
| Alternate-language name | `Chinese Product Name`, `ChineseProductName` |

The source also recognizes Chinese-language aliases for several shipment fields. Keep SKU and barcode cells as **text** so spreadsheet software preserves leading zeroes and long identifiers.

## Fictional example

Type the following entirely fictional rows into `Sheet1`, beginning at A1, and save locally as `.xlsx`:

| Box Number | Product Name | SKU | Barcode | Quantity | Order Reference |
| --- | --- | --- | --- | --- | --- |
| 1 | Demo Notebook | DEMO001 | DEMO000001 | 12 | DEMO-ORDER-001 |
| 1 | Demo Pen Set | DEMO002 | DEMO000002 | 6 | DEMO-ORDER-001 |
| 2 | Demo Storage Box | DEMO003 | DEMO000003 | 8 | DEMO-ORDER-001 |

Import that workbook into a new shipment. Scan `DEMO000001` with quantity 3 to see received 3 against expected 12, leaving 9 missing units for that item.

## Import behavior

- Rows without a barcode or a valid positive whole-number quantity are skipped and reported as import errors.
- Duplicate barcode rows in one workbook combine expected quantities and produce warnings. Product/box details come from the first retained row, so review duplicate-barcode warnings when a product spans boxes.
- A barcode already imported into the same unscanned shipment receives additional expected quantity on another import. Reimporting the same file is additive rather than a replacement.
- A shipment with scan history rejects further workbook imports. Create a new shipment for a different receiving list.
- Names drive classification through prioritized section rules. Missing names fall back to the alternate-language name or barcode.
- Imported products update the local catalog, which supports later product lookup and suggestions.

No workbook binary is included in this repository. Keep generated examples and operational imports outside the source tree; spreadsheet files are ignored by Git.
