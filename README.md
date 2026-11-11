# ShipmentCheckerPro

ShipmentCheckerPro is a local desktop application for checking incoming shipments against expected quantities. It connects Excel shipment imports, barcode receiving, box progress, discrepancy reports, product receipt analytics, and physical tester audits in one workflow.

The project combines an ASP.NET Core API and SQLite database with a React interface packaged through Tauri. This repository contains application source and documentation for a fictional local demonstration.

## Capabilities

| Area | Implemented behavior |
| --- | --- |
| Receiving | Create shipments, import expected quantities from Excel, assign a current box, scan products, and undo the last scan. |
| Product matching | Match exact barcodes, ask for confirmation of a unique SKU suggestion, recognize previously imported catalog products, and record unknown items. |
| Verification | Track expected, received, matched, missing, extra, and unknown units; review box progress and complete boxes or shipments. |
| Classification | Organize products as MainSection > Category > SubCategory using prioritized keyword rules and manual section choices. |
| Product analytics | Rank the top 10 products by received quantity, compare sections, inspect shipment accuracy, and identify repeated shortages or extras. |
| Tester control | Register uniquely coded testers, approve activation, record status changes and reasons, and run physical audits with found/missed results. |
| Reporting | Export a five-sheet shipment workbook or a six-sheet monthly analytics workbook. Complete, archive, and restore shipment records. |

The main receiving workflow and the dedicated **Analytics** page use persisted data. The dashboard's section chart and several navigation pages remain placeholders; see [current limits](#validation-and-current-limits).

## A typical workflow

1. Start the app with a fresh local demonstration database and sign in as **Demo Manager** using the PIN you configured locally.
2. Create a shipment and import a workbook containing expected products, barcodes, quantities, and optional box/order information.
3. Choose the current box and scan items. Review suggested matches before confirming them; investigate unknown barcodes and quantity differences.
4. Review discrepancies and box progress, then complete the shipment. Completed and archived shipments are locked against further scans.
5. Export the shipment workbook. Open **Analytics** to see the month's top received products, section totals, and shipment match rates.
6. Register testers, approve active units, and scan their unique codes during a physical audit to identify found and missed units.

See [receiving and tester workflows](docs/workflows.md) and [the fictional workbook example](docs/workbook-format.md).

## Product and monthly analytics

**Top received products** sums scanned quantities by barcode and shows the top 10. It measures received units rather than sales, revenue, or how often a product appears in deliveries.

The page offers a month selector covering the latest 24 months, eight metric cards, section-level received/missing/extra bars, a discrepancy breakdown, a shipment match-rate chart, tester-status totals, and classification drill-down. Recurring-product analysis identifies products with at least three shortage or excess occurrences in completed/archived shipment history.

The [analytics guide](docs/analytics.md) explains the date selection, formulas, global versus monthly totals, and export sheets.

## Stack and layout

| Layer | Tools |
| --- | --- |
| API and storage | C#, .NET 8, ASP.NET Core, Entity Framework Core, SQLite |
| Interface | React 18, TypeScript, Vite, Tailwind CSS |
| Data and charts | TanStack Query, Zustand, Recharts |
| Workbook processing | ClosedXML |
| Desktop packaging | Tauri 2, Rust, Windows API sidecar |

```text
ShipmentCheckerPro.slnx
backend/       API controllers, workflows, EF models, migrations, import/export
frontend/      React pages, components, API client, session state
src-tauri/     Desktop wrapper and API sidecar lifecycle
scripts/       Development, sidecar publishing, and installer build commands
docs/          Setup, workbook format, workflows, and analytics semantics
```

See [architecture](docs/architecture.md) for how these pieces run together.

## Run locally

For browser development, install the **.NET 8 SDK** and a Node.js version supported by the package engine ranges; Node.js **24 or later** is a straightforward choice for the current lockfiles. Desktop builds additionally need Rust, the Windows MSVC C++ build tools, and WebView2.

From the repository root:

```powershell
npm ci
npm --prefix frontend ci
dotnet restore ShipmentCheckerPro.slnx

# Required when creating the first local manager account.
# The prompt keeps the chosen value out of command history.
$env:SHIPMENTCHECKER_INITIAL_MANAGER_PIN = Read-Host "Choose a local manager PIN (4-12 digits)"

npm run desktop:dev
```

The default database and photos live under `%APPDATA%\ShipmentCheckerProDemo`, outside the repository. `SHIPMENTCHECKER_DATA_DIR` selects another local directory. A fresh database creates **Demo Manager** and generic classification rules; it contains no real shipments or product data.

For separate browser/API development, run `npm run backend:dev` and `npm run frontend:dev` in separate terminals. Defaults are API `127.0.0.1:5085` and frontend `localhost:5174`. See [setup](docs/setup.md) for environment variables, first-run behavior, build commands, and troubleshooting.

## Validation and current limits

Source preparation verified the backend build with no warnings or errors, the frontend production build and lint, and parsing of all five PowerShell helper scripts. An isolated HTTP smoke run passed 21 checks using a temporary database, a generated local PIN, and a fictional workbook. It exercised login, classification, import validation, scan/undo/unknown handling, box and shipment completion, tester approval/audit, analytics, both workbook exports, and archive/restore. The frontend build retains a large-chunk size warning.

- Settings, employee management, store information, and the standalone shipment-history page are placeholders. The scan screen and exported workbooks contain implemented scan-history views.
- The dashboard section chart uses placeholder values; the separate Analytics page calculates results from the database.
- Role checks in the interface do not provide server-side API authorization. Local PINs are stored and compared as plain text. This is a local prototype authentication flow, not a hardened access-control system.
- Monthly receiving totals use shipment completion date, falling back to creation date, and may include open shipments. Chronic-product analysis covers historical completed/archived shipments; current tester status totals are not limited to the selected month.
- Physical scanner/printer use, installer distribution, and multiple-computer operation require separate environment testing.

## Local data

Keep operational workbooks, exported reports, photos, database files, and credentials outside the source tree. The repository includes no original shipment workbooks or runtime database. `.gitignore` excludes databases and sidecars, generated spreadsheets/reports, local environment files, build output, and editor state. Ignore rules do not remove a file already committed.
