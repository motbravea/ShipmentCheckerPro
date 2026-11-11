import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArchiveRestore, Download } from "lucide-react";
import { ShipmentStatus } from "../components/ShipmentStatus";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, type ShipmentListItem } from "../lib/api";
import { useToastStore } from "../store/toasts";

export function ShipmentArchivePage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const shipments = useQuery({
    queryKey: ["archived-shipments"],
    queryFn: api.archivedShipments,
  });

  const restore = useMutation({
    mutationFn: (shipment: ShipmentListItem) => api.restoreShipment(shipment.id),
    onSuccess: (_, shipment) => {
      queryClient.invalidateQueries({ queryKey: ["archived-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      pushToast({ title: `${shipment.name} restored`, description: "It is back in the active shipment list.", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Restore failed", description: error.message, tone: "error" }),
  });

  const exportReport = useMutation({
    mutationFn: (shipment: ShipmentListItem) => api.downloadShipmentReport(shipment.id),
    onSuccess: () => pushToast({ title: "Archived report downloaded", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  return (
    <div className="space-y-5">
      <header>
        <ShipmentStatus status="Archived" />
        <h1 className="mt-3 text-3xl font-semibold text-white">Shipment archive</h1>
        <p className="mt-2 text-sm text-zinc-400">Completed shipment records are preserved here and remain available for reports.</p>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-950 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Scanned</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.isLoading ? (
                <tr><td colSpan={7} className="px-4 py-5 text-zinc-500">Loading archive...</td></tr>
              ) : shipments.data?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-5 text-zinc-500">No archived shipments yet.</td></tr>
              ) : (
                shipments.data?.map((shipment, index) => (
                  <tr key={shipment.id} className={index % 2 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                    <td className="px-4 py-3">
                      <Link to={`/shipments/${shipment.id}`} className="font-medium text-white hover:text-blue-300">{shipment.name}</Link>
                      <p className="text-xs text-zinc-500">{shipment.storeName ?? "No store"} {shipment.orderReference ? `- ${shipment.orderReference}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{shipment.completedAt ? new Date(shipment.completedAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-zinc-300">{shipment.totalExpected}</td>
                    <td className="px-4 py-3 text-zinc-300">{shipment.totalScanned}</td>
                    <td className="px-4 py-3 text-red-300">{shipment.missingUnits}</td>
                    <td className="px-4 py-3 text-orange-300">{shipment.extraUnits}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" isLoading={exportReport.isPending} onClick={() => exportReport.mutate(shipment)}>
                          <Download className="h-4 w-4" />
                          Report
                        </Button>
                        <Button size="sm" variant="secondary" isLoading={restore.isPending} onClick={() => restore.mutate(shipment)}>
                          <ArchiveRestore className="h-4 w-4" />
                          Restore
                        </Button>
                      </div>
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
