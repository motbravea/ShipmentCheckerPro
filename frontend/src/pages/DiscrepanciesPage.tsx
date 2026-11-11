import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Download, ScanLine } from "lucide-react";
import { ItemStatus } from "../components/ShipmentStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, type ShipmentItem } from "../lib/api";
import { useToastStore } from "../store/toasts";

export function DiscrepanciesPage() {
  const shipmentId = Number(useParams().id);
  const pushToast = useToastStore((state) => state.push);
  const shipment = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => api.shipment(shipmentId),
  });
  const discrepancies = useQuery({
    queryKey: ["discrepancies", shipmentId],
    queryFn: () => api.discrepancies(shipmentId),
  });

  const items = discrepancies.data?.items ?? [];
  const unknownItems = discrepancies.data?.unknownItems ?? [];
  const missingCount = items.filter((item) => item.status === "Missing" || item.status === "In Progress").length;
  const extraCount = items.filter((item) => item.status === "Extra").length;
  const exportReport = useMutation({
    mutationFn: () => api.downloadShipmentReport(shipmentId),
    onSuccess: () => pushToast({ title: "Export ready", description: "Discrepancy workbook downloaded.", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone="orange">Review</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Discrepancies</h1>
          <p className="mt-2 text-sm text-zinc-400">{shipment.data?.name ?? "Shipment"} discrepancy review.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportReport.mutate()} isLoading={exportReport.isPending}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link to={`/shipments/${shipmentId}/scan`}>
            <Button>
              <ScanLine className="h-4 w-4" />
              Scan mode
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Missing/in progress products" value={missingCount} tone="red" />
        <Metric label="Extra products" value={extraCount} tone="orange" />
        <Metric label="Unknown barcodes" value={unknownItems.length} tone="red" />
        <Metric label="Match rate" value={`${shipment.data?.summary.matchRate ?? 0}%`} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">Product discrepancies</h2>
          <p className="text-sm text-zinc-500">Confidence flags are ready for chronic detection in later analytics.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">MainSection</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Scanned</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.isLoading ? (
                <tr><td className="px-4 py-5 text-zinc-500" colSpan={7}>Loading discrepancies...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-4 py-5 text-zinc-500" colSpan={7}>No product discrepancies.</td></tr>
              ) : (
                items.map((item, index) => <DiscrepancyRow key={item.id} item={item} index={index} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">Unknown items</h2>
          <p className="text-sm text-zinc-500">These scans were not found in the current shipment.</p>
        </div>
        <div className="divide-y divide-white/10">
          {unknownItems.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">No unknown items logged.</div>
          ) : (
            unknownItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-white">{item.barcode}</p>
                  <p className="text-sm text-zinc-500">Last scanned {new Date(item.lastScannedAt).toLocaleString()}</p>
                </div>
                <Badge tone="red">{item.scannedQuantity} unknown</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function DiscrepancyRow({ item, index }: { item: ShipmentItem; index: number }) {
  const difference = item.scannedQuantity - item.expectedQuantity;
  return (
    <tr className={index % 2 === 1 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
      <td className="px-4 py-3">
        <p className="font-medium text-white">{item.productName}</p>
        <p className="text-xs text-zinc-500">{item.sku} - {item.barcode}</p>
      </td>
      <td className="px-4 py-3"><Badge tone="blue">{item.mainSection}</Badge></td>
      <td className="px-4 py-3 text-zinc-300">{item.expectedQuantity}</td>
      <td className="px-4 py-3 text-zinc-300">{item.scannedQuantity}</td>
      <td className={difference < 0 ? "px-4 py-3 text-red-300" : "px-4 py-3 text-orange-300"}>{difference}</td>
      <td className="px-4 py-3"><ItemStatus status={item.status} /></td>
      <td className="px-4 py-3"><ConfidenceBadge flag={item.confidenceFlag} status={item.status} /></td>
    </tr>
  );
}

function ConfidenceBadge({ flag, status }: { flag: string; status: string }) {
  if (flag !== "normal") {
    return <Badge tone={flag.includes("missing") ? "red" : flag.includes("extra") ? "orange" : "green"}>{flag}</Badge>;
  }

  if (status === "Matched") {
    return <Badge tone="green">normal</Badge>;
  }

  return <Badge tone="orange">new_discrepancy</Badge>;
}

function Metric({ label, value, tone = "blue" }: { label: string; value: string | number; tone?: "blue" | "red" | "orange" }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <AlertTriangle className={tone === "red" ? "h-5 w-5 text-red-400" : tone === "orange" ? "h-5 w-5 text-orange-400" : "h-5 w-5 text-blue-400"} />
      </div>
    </Card>
  );
}
