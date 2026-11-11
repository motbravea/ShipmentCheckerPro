import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Download,
  PackageCheck,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useToastStore } from "../store/toasts";

const currentMonth = new Date().toISOString().slice(0, 7);
const monthOptions = Array.from({ length: 24 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - index);
  return {
    value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
});
const discrepancyColors = ["#ef4444", "#f59e0b", "#8b5cf6"];
const testerColors = ["#22c55e", "#f59e0b", "#71717a", "#ef4444", "#ec4899", "#06b6d4"];

export function AnalyticsPage() {
  const [period, setPeriod] = useState(currentMonth);
  const [sectionFilter, setSectionFilter] = useState("All");
  const pushToast = useToastStore((state) => state.push);
  const [year, month] = period.split("-").map(Number);
  const analytics = useQuery({
    queryKey: ["monthly-analytics", year, month],
    queryFn: () => api.monthlyAnalytics(year, month),
  });
  const exportReport = useMutation({
    mutationFn: () => api.downloadMonthlyAnalytics(year, month),
    onSuccess: () => pushToast({ title: "Analytics exported", description: "The Excel workbook is in your Downloads folder.", tone: "success" }),
    onError: (error) => pushToast({ title: "Export failed", description: error.message, tone: "error" }),
  });

  const sectionChart = useMemo(() => {
    const grouped = new Map<string, { mainSection: string; received: number; missing: number; extra: number }>();
    for (const row of analytics.data?.sections ?? []) {
      const current = grouped.get(row.mainSection) ?? { mainSection: row.mainSection, received: 0, missing: 0, extra: 0 };
      current.received += row.receivedUnits;
      current.missing += row.missingUnits;
      current.extra += row.extraUnits;
      grouped.set(row.mainSection, current);
    }
    return [...grouped.values()].sort((a, b) => b.received - a.received);
  }, [analytics.data]);

  const sectionNames = ["All", ...sectionChart.map((row) => row.mainSection)];
  const detailRows = (analytics.data?.sections ?? []).filter((row) => sectionFilter === "All" || row.mainSection === sectionFilter);
  const data = analytics.data;

  const metrics = data
    ? [
        { label: "Units received", value: data.totalUnitsReceived, icon: PackageCheck, tone: "text-green-400" },
        { label: "Completed shipments", value: data.completedShipments, icon: Boxes, tone: "text-blue-400" },
        { label: "Average match rate", value: `${data.averageMatchRate}%`, icon: ScanSearch, tone: "text-cyan-400" },
        { label: "Active tester units", value: data.activeTesters, icon: ShieldCheck, tone: "text-emerald-400" },
        { label: "Chronic products", value: data.chronicProblemProducts, icon: AlertTriangle, tone: "text-red-400" },
        { label: "Tester losses", value: data.testerLosses, icon: ShieldAlert, tone: "text-pink-400" },
        { label: "Unknown units", value: data.unknownUnits, icon: ScanSearch, tone: "text-violet-400" },
        { label: "Manual adjustments", value: data.manualAdjustments, icon: SlidersHorizontal, tone: "text-orange-400" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="blue">Monthly operations intelligence</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white">Analytics</h1>
          <p className="mt-2 text-sm text-zinc-400">Shipment accuracy, section performance, product risk, and tester control in one monthly view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Analytics month"
            className="h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white"
            value={period}
            onChange={(event) => { setPeriod(event.target.value); setSectionFilter("All"); }}
          >
            {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Button variant="secondary" isLoading={exportReport.isPending} onClick={() => exportReport.mutate()}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </header>

      {analytics.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Card key={index} className="h-28 animate-pulse bg-white/[0.025]" />)}
        </div>
      ) : analytics.isError || !data ? (
        <Card className="p-5 text-sm text-red-300">{analytics.error?.message ?? "Analytics could not be loaded."}</Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs uppercase text-zinc-500">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p></div>
                    <Icon className={`h-5 w-5 ${metric.tone}`} />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <ChartCard title="Units received by MainSection" description="Received, missing, and extra units grouped at the primary analytics level.">
              {sectionChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="mainSection" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="received" name="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="missing" name="Missing" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="extra" name="Extra" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Discrepancy mix" description="Unit-level missing, extra, and unknown breakdown.">
              {data.discrepancies.some((row) => row.units > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.discrepancies} dataKey="units" nameKey="type" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {data.discrepancies.map((row, index) => <Cell key={row.type} fill={discrepancyColors[index % discrepancyColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <ChartCard title="Shipment match rate" description="Accuracy trend for shipments included in the selected month.">
              {data.shipmentAccuracy.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.shipmentAccuracy}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="shipmentName" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="matchRate" name="Match rate %" stroke="#38bdf8" strokeWidth={3} dot={{ fill: "#38bdf8", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Tester status" description={`${data.testerAuditMissedUnits} tester units missed in completed audits this month.`}>
              {data.testerStatuses.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.testerStatuses} dataKey="units" nameKey="status" innerRadius={58} outerRadius={92}>
                      {data.testerStatuses.map((row, index) => <Cell key={row.status} fill={testerColors[index % testerColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataTable title="Top received products" empty="No products received in this month.">
              {data.topProducts.map((product, index) => (
                <div key={product.barcode} className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 first:border-t-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{index + 1}. {product.productName}</p><p className="text-xs text-zinc-500">{product.mainSection} &gt; {product.category} · {product.sku ?? product.barcode}</p></div>
                  <Badge tone="green">{product.receivedUnits} units</Badge>
                </div>
              ))}
            </DataTable>

            <DataTable title="Chronic problem products" empty="No products have reached three discrepancy occurrences.">
              {data.chronicProducts.map((product) => (
                <div key={product.barcode} className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 first:border-t-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{product.productName}</p><p className="text-xs text-zinc-500">{product.mainSection} · {product.missingOccurrences} missing / {product.extraOccurrences} extra</p></div>
                  <Badge tone={product.trend.includes("missing") ? "red" : "orange"}>{product.trend}</Badge>
                </div>
              ))}
            </DataTable>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
              <div><h2 className="font-semibold text-white">Classification drill-down</h2><p className="text-sm text-zinc-500">MainSection is the primary level; Category and SubCategory provide detail.</p></div>
              <select className="h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
                {sectionNames.map((section) => <option key={section}>{section}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Hierarchy</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Missing</th><th className="px-4 py-3">Extra</th><th className="px-4 py-3">Rate</th></tr></thead>
                <tbody>
                  {detailRows.length ? detailRows.map((row, index) => (
                    <tr key={`${row.mainSection}-${row.category}-${row.subCategory}`} className={index % 2 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                      <td className="px-4 py-3"><Badge tone="blue">{row.mainSection}</Badge><p className="mt-1 text-xs text-zinc-500">{row.category} &gt; {row.subCategory}</p></td>
                      <td className="px-4 py-3 text-zinc-300">{row.productCount}</td><td className="px-4 py-3 text-zinc-300">{row.expectedUnits}</td><td className="px-4 py-3 text-green-300">{row.receivedUnits}</td><td className="px-4 py-3 text-red-300">{row.missingUnits}</td><td className="px-4 py-3 text-orange-300">{row.extraUnits}</td><td className="px-4 py-3 text-zinc-300">{row.discrepancyRate}%</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="px-4 py-5 text-zinc-500">No classification data for this selection.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const tooltipStyle = { background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 };

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="p-5"><h2 className="font-semibold text-white">{title}</h2><p className="text-sm text-zinc-500">{description}</p><div className="mt-4 h-72">{children}</div></Card>;
}

function EmptyChart() {
  return <div className="grid h-full place-items-center text-sm text-zinc-500">No data for the selected month.</div>;
}

function DataTable({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <Card className="overflow-hidden"><div className="border-b border-white/10 p-5"><h2 className="font-semibold text-white">{title}</h2></div>{hasRows ? children : <p className="p-5 text-sm text-zinc-500">{empty}</p>}</Card>;
}
