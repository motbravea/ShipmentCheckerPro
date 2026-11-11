import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, Archive, CheckCircle2, Package, ScanLine, ShieldCheck } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ShipmentStatus } from "../components/ShipmentStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";

const mainSectionData = [
  { mainSection: "Collectibles", units: 0 },
  { mainSection: "Beauty", units: 0 },
  { mainSection: "Electronics", units: 0 },
  { mainSection: "Stationery", units: 0 },
];

export function DashboardPage() {
  const shipments = useQuery({
    queryKey: ["shipments"],
    queryFn: api.shipments,
  });
  const archivedShipments = useQuery({
    queryKey: ["archived-shipments"],
    queryFn: api.archivedShipments,
  });
  const testers = useQuery({
    queryKey: ["testers"],
    queryFn: () => api.testers(),
  });

  const shipmentRows = shipments.data ?? [];
  const activeShipments = shipmentRows.filter((shipment) => shipment.status !== "Completed").length;
  const scannedUnits = shipmentRows.reduce((total, shipment) => total + shipment.totalScanned, 0);
  const cards = [
    { label: "Active shipments", value: activeShipments, icon: Package },
    { label: "Units scanned", value: scannedUnits, icon: ScanLine },
    { label: "Active testers", value: testers.data?.filter((tester) => tester.status === "Active").reduce((total, tester) => total + tester.quantity, 0) ?? 0, icon: ShieldCheck },
    { label: "Archived cycles", value: archivedShipments.data?.length ?? 0, icon: Archive },
  ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone="blue">Phase 2 shipment core</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Store operations dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">Create shipments, import Excel files, scan items, and track boxes locally.</p>
        </div>
        <Button>
          <Link to="/shipments/new">New shipment</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/8 text-zinc-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Units by MainSection</h2>
              <p className="text-sm text-zinc-500">Primary analytics aggregate by top-level classification.</p>
            </div>
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainSectionData}>
                <XAxis dataKey="mainSection" tickLine={false} axisLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="units" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Foundation status</h2>
              <p className="text-sm text-zinc-500">Local-first base is online.</p>
            </div>
          </div>
          <div className="space-y-3">
            {["SQLite schema", "Local manager", "Section rules", "Navigation shell"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3">
                <span className="text-sm text-zinc-300">{item}</span>
                <Badge tone="green">Ready</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">Recent shipments</h2>
          <p className="text-sm text-zinc-500">Open a shipment to import or scan.</p>
        </div>
        <div className="divide-y divide-white/10">
          {shipmentRows.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">No shipments yet.</div>
          ) : (
            shipmentRows.slice(0, 8).map((shipment) => (
              <Link key={shipment.id} className="flex items-center justify-between gap-4 p-4 transition hover:bg-white/[0.035]" to={`/shipments/${shipment.id}`}>
                <div>
                  <p className="font-medium text-white">{shipment.name}</p>
                  <p className="text-sm text-zinc-500">{shipment.storeName ?? "No store"} - {shipment.totalScanned}/{shipment.totalExpected} scanned</p>
                </div>
                <ShipmentStatus status={shipment.status} />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
