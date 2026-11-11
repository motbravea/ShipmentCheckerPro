import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { FileSpreadsheet, ScanLine } from "lucide-react";
import { ShipmentStatus } from "../components/ShipmentStatus";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, type ImportSummary } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

export function ImportShipmentPage() {
  const shipmentId = Number(useParams().id);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const shipment = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => api.shipment(shipmentId),
    enabled: Number.isFinite(shipmentId),
  });

  const importFile = useMutation({
    mutationFn: () => api.importShipmentExcel(shipmentId, file!, user?.name),
    onSuccess: (result) => {
      setSummary(result);
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      pushToast({ title: "Import finished", description: `${result.rowsImported} rows imported`, tone: "success" });
    },
    onError: (error) => pushToast({ title: "Import failed", description: error.message, tone: "error" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      pushToast({ title: "Choose an Excel file", tone: "error" });
      return;
    }
    importFile.mutate();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-white">Import Excel</h1>
          <p className="mt-2 text-sm text-zinc-400">{shipment.data?.name ?? "Shipment workbook import"}</p>
        </div>
        {shipment.data ? <ShipmentStatus status={shipment.data.status} /> : null}
      </header>

      <Card className="p-5">
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Excel file</span>
            <input
              className="block w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
              accept=".xlsx,.xls"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <Button isLoading={importFile.isPending}>
            <FileSpreadsheet className="h-4 w-4" />
            Import
          </Button>
        </form>
      </Card>

      {summary ? (
        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="This file" value={summary.rowsImported} />
            <Metric label="Total products in shipment" value={summary.totalProductsInShipment} />
            <Metric label="Total expected units" value={summary.totalExpectedQuantityInShipment} />
            <Metric label="Rows rejected" value={summary.rowsRejected} />
            <Metric label="Warnings" value={summary.warningCount} />
          </div>
          <Messages title="Warnings" items={summary.warnings} />
          <Messages title="Rejected rows" items={summary.errors} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/shipments/${shipmentId}/scan`)}>
              <ScanLine className="h-4 w-4" />
              Start scanning
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/shipments/${shipmentId}`)}>
              View shipment
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Messages({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-zinc-400">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
