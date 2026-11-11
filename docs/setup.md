# Local setup

## Prerequisites

For the API and browser interface:

- .NET 8 SDK.
- Node.js and npm. The current lockfiles require compatible package engines: Vite accepts Node 20.19+ or 22.12+, while ESLint's Node 22 range begins at 22.13. Node 24+ satisfies both.

For Windows desktop development and packaging, also install Rust with the MSVC toolchain, the Windows C++ build tools, and WebView2. The supplied sidecar publishing script targets `win-x64`.

## Install dependencies

From the repository root:

```powershell
npm ci
npm --prefix frontend ci
dotnet restore ShipmentCheckerPro.slnx
```

The root npm package supplies the Tauri CLI and workspace commands; the frontend has its own dependency lockfile.

## First-run configuration

For a new database, provide a manager PIN containing 4-12 ASCII digits in the terminal that launches the backend or desktop app:

```powershell
$env:SHIPMENTCHECKER_INITIAL_MANAGER_PIN = Read-Host "Choose a local manager PIN (4-12 digits)"
```

Startup applies the schema and creates a **Demo Manager** account when there are no employee records. It also supplies generic classification rules. Choose that account on the login screen and enter the PIN you supplied.

An existing database with employee records does not require the bootstrap variable. Changing the variable does not reset an existing account's PIN. The employee-management screen is not implemented, so account maintenance is outside the current UI.

| Variable | Meaning |
| --- | --- |
| `SHIPMENTCHECKER_INITIAL_MANAGER_PIN` | Required to create the first account in an empty database; no fixed default. |
| `SHIPMENTCHECKER_DATA_DIR` | Optional local runtime directory; defaults to `%APPDATA%\ShipmentCheckerProDemo`. |
| `SHIPMENTCHECKER_API_URLS` | API listen URL; defaults to `http://127.0.0.1:5085`. |
| `VITE_API_BASE_URL` | Frontend API base URL, including `/api/v1`; defaults to `http://127.0.0.1:5085/api/v1`. |

The runtime directory contains `data.db` and `photos/`. Use a separate directory for each independent demonstration; do not point this copy at operational data. The browser stores UI session/theme state locally, while the backend persists operational records in SQLite.

## Run in a browser

Terminal 1, with the bootstrap environment variable set for a fresh database:

```powershell
npm run backend:dev
```

Terminal 2:

```powershell
npm run frontend:dev
```

Open `http://localhost:5174`. The API uses port 5085; development Swagger is available from the backend's `/swagger` route. A fresh database contains no shipment data: create a shipment and import a fictional workbook using [the documented format](workbook-format.md).

If you override the backend URL, configure the frontend's API base URL consistently. The desktop wrapper sets its local sidecar endpoint explicitly; coordinate both sides before changing desktop ports.

## Run or package the desktop app

From a terminal with the first-run PIN variable set when needed:

```powershell
npm run desktop:dev
```

The Tauri development hook prepares a self-contained API sidecar and starts Vite. The desktop wrapper starts the API child process and stops it when its window closes.

For release builds:

```powershell
dotnet build ShipmentCheckerPro.slnx -c Release
npm run frontend:build
npm run desktop:build
```

The desktop build hook republishes the sidecar before building the frontend. Generated sidecar binaries and Rust output are excluded from Git. The bundle configuration targets Windows NSIS/MSI installers; validate generated installers in a separate environment before distributing them.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| First startup stops with a PIN setup error | Provide 4-12 digits in `SHIPMENTCHECKER_INITIAL_MANAGER_PIN` before launching the backend/desktop process. |
| Login fails after changing the bootstrap variable | Existing account PINs are retained; the variable only creates the first account. |
| Frontend cannot load employees or shipments | Confirm the API runs on 5085 and the configured frontend API base URL matches. |
| Vite reports its port is busy | Stop the conflicting development process or coordinate a port change with the desktop configuration. |
| Import rejects a workbook | Use `.xlsx`, a worksheet named `Sheet1`, and row-one headers including barcode and quantity. |
| Barcode scan is unknown | Check text formatting/leading zeroes and the current shipment's imported barcodes; inspect suggestions before confirming. |
| A completed shipment will not accept scans | Completion locks receiving; archive restore changes archive visibility rather than reopening receiving. |
| Sidecar changes are not visible in development | Run `npm run prepare:sidecar` to rebuild the generated API sidecar. |

PINs are currently stored as plain text, and the API does not enforce role authorization. Keep this prototype on the local demonstration boundary rather than treating the interface's role controls as a security boundary.
