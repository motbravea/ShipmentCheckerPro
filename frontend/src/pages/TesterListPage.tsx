import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { TesterStatus } from "../components/TesterStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";

const statuses = ["", "Pending Approval", "Active", "Inactive", "Damaged", "Lost", "Stolen", "Replaced"];

export function TesterListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const testers = useQuery({
    queryKey: ["testers", search, status],
    queryFn: () => api.testers({ search, status }),
  });

  const summary = useMemo(() => {
    const rows = testers.data ?? [];
    return {
      records: rows.length,
      units: rows.reduce((total, tester) => total + tester.quantity, 0),
      active: rows.filter((tester) => tester.status === "Active").length,
      pending: rows.filter((tester) => tester.status === "Pending Approval").length,
    };
  }, [testers.data]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="blue">Controlled store samples</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white">Testers</h1>
          <p className="mt-2 text-sm text-zinc-400">Register, approve, audit, and retire every tester with a permanent history.</p>
        </div>
        <Button type="button" onClick={() => navigate("/testers/new")}>
          <Plus className="h-4 w-4" />
          New tester
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tester records", summary.records],
          ["Total units", summary.units],
          ["Active", summary.active],
          ["Pending approval", summary.pending],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs uppercase text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
            <Input className="w-full pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tester code, product, SKU, or barcode" />
          </label>
          <select className="h-11 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-zinc-950 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Tester</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Last audit</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {testers.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-5 text-zinc-500">Loading testers...</td></tr>
              ) : testers.data?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500"><ShieldCheck className="mx-auto mb-3 h-7 w-7" />No testers match this view.</td></tr>
              ) : testers.data?.map((tester, index) => (
                <tr key={tester.id} className={index % 2 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-blue-300 hover:text-blue-200" to={`/testers/${tester.id}`}>{tester.testerCode}</Link>
                    <p className="text-xs text-zinc-500">{tester.barcode}</p>
                  </td>
                  <td className="px-4 py-3 text-white">{tester.productName}<p className="text-xs text-zinc-500">{tester.sku ?? "No SKU"}</p></td>
                  <td className="px-4 py-3"><Badge tone="blue">{tester.mainSection}</Badge><p className="mt-1 text-xs text-zinc-500">{tester.category} &gt; {tester.subCategory}</p></td>
                  <td className="px-4 py-3 text-zinc-300">{tester.quantity}</td>
                  <td className="px-4 py-3 text-zinc-400">{tester.lastAuditAt ? new Date(tester.lastAuditAt).toLocaleDateString() : "Never"}{tester.missedAuditCount ? <p className="text-xs text-red-300">{tester.missedAuditCount} missed</p> : null}</td>
                  <td className="px-4 py-3"><TesterStatus status={tester.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
