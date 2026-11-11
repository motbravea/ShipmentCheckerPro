# ShipmentCheckerPro frontend

React 18 and TypeScript interface for the shipment receiving API and Tauri desktop wrapper. The UI includes receiving, box progress, discrepancies, completion/archive, tester registration and audits, section rules, monthly analytics, and workbook export.

From the repository root:

```powershell
npm --prefix frontend ci
npm run frontend:dev
npm run frontend:build
```

The Vite server uses `http://localhost:5174`. The API client defaults to `http://127.0.0.1:5085/api/v1`; `VITE_API_BASE_URL` overrides it at development/build time. Start the backend separately for browser development. For the desktop wrapper, use `npm run desktop:dev` from the root after installing the root dependencies.

See the [project README](../README.md), [setup guide](../docs/setup.md), and [analytics semantics](../docs/analytics.md). Settings, employee management, store information, and the standalone history route remain placeholders. Role gating here is a UI behavior; the API does not enforce role authorization.
