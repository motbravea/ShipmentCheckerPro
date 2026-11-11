import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Box, CheckCircle2, Download, FileSpreadsheet, ScanLine } from "lucide-react";
import { ItemStatus, ShipmentStatus } from "../components/ShipmentStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useToastStore } from "../store/toasts";

export function ShipmentDetailPage() {
  const shipmentId = Number(useParams().id);
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const shipment = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => api.shipment(shipmentId),
    enabled: Number.isFinite(shipmentId),
  });
  const exportReport = useMutation({
    mutationFn: () => api.downloadShipmentReport(shipmentId),
    onSuccess: () => pushToast({ title: "Export ready", description: "Shipment Excel report downloaded.", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  if (shipment.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />;
  }

  if (!shipment.data) {
    return <p className="text-sm text-zinc-400">Shipment not found.</p>;
  }

  const data = shipment.data;
  const isLocked = data.status === "Completed" || data.status === "Archived";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <ShipmentStatus status={data.status} />
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">{data.name}</h1>
          <p className="mt-2 text-sm text-zinc-400">{data.storeName ?? "No store set"} {data.orderReference ? `- ${data.orderReference}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isLocked ? (
            <>
              <Button variant="secondary" onClick={() => navigate(`/shipments/${data.id}/import`)}>
                <FileSpreadsheet className="h-4 w-4" />
                Import
              </Button>
              <Button onClick={() => navigate(`/shipments/${data.id}/scan`)}>
                <ScanLine className="h-4 w-4" />
                Scan
              </Button>
            </>
          ) : null}
          <Button variant="secondary" onClick={() => navigate(`/shipments/${data.id}/discrepancies`)}>
            <AlertTriangle className="h-4 w-4" />
            Discrepancies
          </Button>
          <Button variant="secondary" onClick={() => exportReport.mutate()} isLoading={exportReport.isPending}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          {data.status !== "Archived" ? (
            <Button variant={data.status === "Completed" ? "secondary" : "default"} onClick={() => navigate(`/shipments/${data.id}/complete`)}>
              <CheckCircle2 className="h-4 w-4" />
              {data.status === "Completed" ? "Archive" : "Complete"}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-6">
        <Metric label="Products imported" value={data.summary.totalItems} />
        <Metric label="Expected" value={data.summary.totalExpected} />
        <Metric label="Scanned" value={data.summary.totalScanned} />
        <Metric label="Missing" value={data.summary.missingUnits} />
        <Metric label="Extra" value={data.summary.extraUnits} />
        <Metric label="Unknown" value={data.summary.unknownUnits} />
        <Metric label="Match rate" value={`${data.summary.matchRate}%`} />
      </div>

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-zinc-400">Scan progress</span>
          <span className="font-medium text-white">{data.summary.matchRate}% matched</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, data.summary.matchRate)}%` }} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Products</h2>
            <p className="text-sm text-zinc-500">MainSection badge is shown for scan-floor readability.</p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200" to={`/shipments/${data.id}/boxes`}>
            <Box className="h-4 w-4" />
            Boxes
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">MainSection</th>
                <th className="px-4 py-3">Hierarchy</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Scanned</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 1 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                  <td className="px-4 py-3 text-zinc-400">{item.boxNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{item.productName}</p>
                    <p className="text-xs text-zinc-500">{item.sku} - {item.barcode}</p>
                  </td>
                  <td className="px-4 py-3"><Badge tone="blue">{item.mainSection}</Badge></td>
                  <td className="px-4 py-3 text-zinc-400">{item.mainSection} &gt; {item.category} &gt; {item.subCategory}</td>
                  <td className="px-4 py-3 text-zinc-300">{item.expectedQuantity}</td>
                  <td className="px-4 py-3 text-zinc-300">{item.scannedQuantity}</td>
                  <td className="px-4 py-3"><ItemStatus status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}
