import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { BoxesPage } from "./pages/BoxesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DiscrepanciesPage } from "./pages/DiscrepanciesPage";
import { ExportCenterPage } from "./pages/ExportCenterPage";
import { ImportShipmentPage } from "./pages/ImportShipmentPage";
import { LoginPage } from "./pages/LoginPage";
import { NewShipmentPage } from "./pages/NewShipmentPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ScanPage } from "./pages/ScanPage";
import { SectionRulesPage } from "./pages/SectionRulesPage";
import { ShipmentDetailPage } from "./pages/ShipmentDetailPage";
import { ShipmentCompletionPage } from "./pages/ShipmentCompletionPage";
import { ShipmentArchivePage } from "./pages/ShipmentArchivePage";
import { TesterAuditPage } from "./pages/TesterAuditPage";
import { TesterDetailPage } from "./pages/TesterDetailPage";
import { TesterListPage } from "./pages/TesterListPage";
import { NewTesterPage } from "./pages/NewTesterPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { useSessionStore } from "./store/session";
import { Toaster } from "./components/Toaster";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useSessionStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

const placeholders = [
  { path: "/shipments/:id/history", title: "Scan history", description: "Immutable scan event log for verification work." },
  { path: "/settings", title: "Settings", description: "Local app settings, store details, and role-gated configuration." },
  { path: "/settings/employees", title: "Employees", description: "Local employee list and 4-digit PIN management." },
  { path: "/settings/store", title: "Store info", description: "Store identity and future cloud-sync readiness." },
];

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/new"
          element={
            <ProtectedRoute>
              <NewShipmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id/import"
          element={
            <ProtectedRoute>
              <ImportShipmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id/scan"
          element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id/boxes"
          element={
            <ProtectedRoute>
              <BoxesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id/discrepancies"
          element={
            <ProtectedRoute>
              <DiscrepanciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id/complete"
          element={
            <ProtectedRoute>
              <ShipmentCompletionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/archive"
          element={
            <ProtectedRoute>
              <ShipmentArchivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/:id"
          element={
            <ProtectedRoute>
              <ShipmentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/export"
          element={
            <ProtectedRoute>
              <ExportCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/sections"
          element={
            <ProtectedRoute>
              <SectionRulesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/testers" element={<ProtectedRoute><TesterListPage /></ProtectedRoute>} />
        <Route path="/testers/new" element={<ProtectedRoute><NewTesterPage /></ProtectedRoute>} />
        <Route path="/testers/audit" element={<ProtectedRoute><TesterAuditPage /></ProtectedRoute>} />
        <Route path="/testers/:id" element={<ProtectedRoute><TesterDetailPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        {placeholders.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={
              <ProtectedRoute>
                <PlaceholderPage title={page.title} description={page.description} />
              </ProtectedRoute>
            }
          />
        ))}
      </Routes>
      <Toaster />
    </>
  );
}
