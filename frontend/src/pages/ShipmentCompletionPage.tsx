import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Archive, CheckCircle2, CircleX, FileDown } from "lucide-react";
import { ShipmentStatus } from "../components/ShipmentStatus";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

export function ShipmentCompletionPage() {
  const shipmentId = Number(useParams().id);
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);

  const shipment = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => api.shipment(shipmentId),
  });
  const completion = useQuery({
    queryKey: ["shipment-completion", shipmentId],
    queryFn: () => api.shipmentCompletion(shipmentId),
  });

  const complete = useMutation({
    mutationFn: () => api.completeShipment(shipmentId, user?.name, acknowledged),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment-completion", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      pushToast({ title: "Shipment completed", description: "The shipment is now locked from imports and scans.", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not complete shipment", description: error.message, tone: "error" }),
  });

  const archive = useMutation({
    mutationFn: () => api.archiveShipment(shipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["archived-shipments"] });
      pushToast({ title: "Shipment archived", tone: "success" });
      navigate("/shipments/archive");
    },
    onError: (error) => pushToast({ title: "Could not archive shipment", description: error.message, tone: "error" }),
  });

  const exportReport = useMutation({
    mutationFn: () => api.downloadShipmentReport(shipmentId),
    onSuccess: () => pushToast({ title: "Report downloaded", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  if (shipment.isLoading || completion.isLoading) {
    return <div className="h-72 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />;
  }

  if (!shipment.data || !completion.data) {
    return <p className="text-sm text-zinc-400">Shipment not found.</p>;
  }

  const data = completion.data;
  const isCompleted = shipment.data.status === "Completed";
  const needsAcknowledgement = data.hasDiscrepancies && !acknowledged;
  const canSubmit = data.canComplete && !needsAcknowledgement && !isCompleted;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <ShipmentStatus status={shipment.data.status} />
          <h1 className="mt-3 text-3xl font-semibold text-white">Complete shipment</h1>
          <p className="mt-2 text-sm text-zinc-400">{shipment.data.name}</p>
        </div>
        <Link to={`/shipments/${shipmentId}`} className="text-sm text-blue-300 hover:text-blue-200">Back to shipment</Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Completion checklist</h2>
          <div className="mt-4 space-y-3">
            <CheckRow
              ready={data.hasImportedProducts}
              title="Shipment products imported"
              detail={`${data.summary.totalItems} products, ${data.summary.totalExpected} expected units`}
            />
            <CheckRow
              ready={data.allBoxesComplete}
              title="All boxes completed"
              detail={`${data.completedBoxes} of ${data.totalBoxes} boxes complete`}
              action={!data.allBoxesComplete ? <Link to={`/shipments/${shipmentId}/boxes`} className="text-xs text-blue-300">Review boxes</Link> : null}
            />
            <CheckRow
              ready={!data.hasDiscrepancies}
              warning={data.hasDiscrepancies}
              title={data.hasDiscrepancies ? "Discrepancies require acknowledgement" : "No open discrepancies"}
              detail={`${data.summary.missingUnits} missing, ${data.summary.extraUnits} extra, ${data.summary.unknownUnits} unknown`}
              action={data.hasDiscrepancies ? <Link to={`/shipments/${shipmentId}/discrepancies`} className="text-xs text-blue-300">Review discrepancies</Link> : null}
            />
          </div>

          {data.hasDiscrepancies && !isCompleted ? (
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-orange-500/25 bg-orange-500/10 p-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4 accent-orange-500"
              />
              <span>
                <span className="block text-sm font-medium text-orange-100">I reviewed the remaining discrepancies</span>
                <span className="mt-1 block text-xs text-orange-200/70">Completing will preserve them in reports and lock this shipment from further scanning.</span>
              </span>
            </label>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Final totals</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Expected" value={data.summary.totalExpected} />
            <Metric label="Scanned" value={data.summary.totalScanned} />
            <Metric label="Missing" value={data.summary.missingUnits} tone="red" />
            <Metric label="Extra" value={data.summary.extraUnits} tone="orange" />
            <Metric label="Unknown" value={data.summary.unknownUnits} tone="red" />
            <Metric label="Match rate" value={`${data.summary.matchRate}%`} />
          </div>

          <div className="mt-5 space-y-2">
            {!isCompleted ? (
              <Button className="w-full" disabled={!canSubmit} isLoading={complete.isPending} onClick={() => complete.mutate()}>
                <CheckCircle2 className="h-4 w-4" />
                Complete and lock
              </Button>
            ) : (
              <Button className="w-full" variant="secondary" isLoading={archive.isPending} onClick={() => archive.mutate()}>
                <Archive className="h-4 w-4" />
                Move to archive
              </Button>
            )}
            <Button className="w-full" variant="secondary" isLoading={exportReport.isPending} onClick={() => exportReport.mutate()}>
              <FileDown className="h-4 w-4" />
              Download final report
            </Button>
          </div>

          {!data.canComplete && !isCompleted ? (
            <p className="mt-3 text-xs text-zinc-500">Finish the blocked checklist items before completing.</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function CheckRow({
  ready,
  warning = false,
  title,
  detail,
  action,
}: {
  ready: boolean;
  warning?: boolean;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  const Icon = ready ? CheckCircle2 : warning ? AlertTriangle : CircleX;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <Icon className={ready ? "mt-0.5 h-5 w-5 text-green-400" : warning ? "mt-0.5 h-5 w-5 text-orange-400" : "mt-0.5 h-5 w-5 text-red-400"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">{title}</p>
          {action}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "red" | "orange" }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={tone === "red" ? "mt-1 text-xl font-semibold text-red-300" : tone === "orange" ? "mt-1 text-xl font-semibold text-orange-300" : "mt-1 text-xl font-semibold text-white"}>{value}</p>
    </div>
  );
}
