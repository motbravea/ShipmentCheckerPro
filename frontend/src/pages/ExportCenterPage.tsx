import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { ShipmentStatus } from "../components/ShipmentStatus";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, type ShipmentListItem } from "../lib/api";
import { useToastStore } from "../store/toasts";

export function ExportCenterPage() {
  const pushToast = useToastStore((state) => state.push);
  const shipments = useQuery({
    queryKey: ["shipments"],
    queryFn: api.shipments,
  });

  const exportReport = useMutation({
    mutationFn: (shipment: ShipmentListItem) => api.downloadShipmentReport(shipment.id),
    onSuccess: () => pushToast({ title: "Export ready", description: "Shipment Excel report downloaded.", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Export Center</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Download complete shipment workbooks with summary, boxes, products, discrepancies, unknowns, and scan history.</p>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Scanned</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3">Unknown</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.isLoading ? (
                <tr><td className="px-4 py-5 text-zinc-500" colSpan={8}>Loading shipments...</td></tr>
              ) : shipments.data?.length === 0 ? (
                <tr><td className="px-4 py-5 text-zinc-500" colSpan={8}>No shipments ready for export.</td></tr>
              ) : (
                shipments.data?.map((shipment, index) => (
                  <tr key={shipment.id} className={index % 2 === 1 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{shipment.name}</p>
                      <p className="text-xs text-zinc-500">{shipment.storeName ?? "No store"} {shipment.orderReference ? `- ${shipment.orderReference}` : ""}</p>
                    </td>
                    <td className="px-4 py-3"><ShipmentStatus status={shipment.status} /></td>
                    <td className="px-4 py-3 text-zinc-300">{shipment.totalExpected}</td>
                    <td className="px-4 py-3 text-zinc-300">{shipment.totalScanned}</td>
                    <td className="px-4 py-3 text-red-300">{shipment.missingUnits}</td>
                    <td className="px-4 py-3 text-orange-300">{shipment.extraUnits}</td>
                    <td className="px-4 py-3 text-red-300">{shipment.unknownUnits}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => exportReport.mutate(shipment)}
                        isLoading={exportReport.isPending}
                      >
                        <Download className="h-4 w-4" />
                        Excel
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
