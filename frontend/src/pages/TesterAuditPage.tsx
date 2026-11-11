import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Play, ScanLine } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

export function TesterAuditPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const audits = useQuery({ queryKey: ["tester-audits"], queryFn: api.testerAudits });
  const openAudit = useMemo(() => audits.data?.find((audit) => !audit.completedAt), [audits.data]);
  const auditId = selectedId ?? openAudit?.id ?? null;

  const detail = useQuery({
    queryKey: ["tester-audit", auditId],
    queryFn: () => api.testerAudit(auditId as number),
    enabled: auditId !== null,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tester-audits"] });
    queryClient.invalidateQueries({ queryKey: ["tester-audit", auditId] });
    queryClient.invalidateQueries({ queryKey: ["testers"] });
  };
  const start = useMutation({
    mutationFn: () => api.startTesterAudit(user?.name),
    onSuccess: (audit) => { setSelectedId(audit.id); refresh(); pushToast({ title: "Tester audit started", description: `${audit.totalExpected} active tester units expected.`, tone: "success" }); },
    onError: (error) => pushToast({ title: "Could not start audit", description: error.message, tone: "error" }),
  });
  const scan = useMutation({
    mutationFn: () => api.scanTesterAudit(auditId as number, code, user?.name),
    onSuccess: () => { setCode(""); refresh(); inputRef.current?.focus(); },
    onError: (error) => { pushToast({ title: "Tester not accepted", description: error.message, tone: "error" }); inputRef.current?.select(); },
  });
  const complete = useMutation({
    mutationFn: () => api.completeTesterAudit(auditId as number),
    onSuccess: () => { refresh(); pushToast({ title: "Tester audit completed", tone: "success" }); },
    onError: (error) => pushToast({ title: "Could not complete audit", description: error.message, tone: "error" }),
  });
  const submitScan = (event: FormEvent) => { event.preventDefault(); if (code.trim()) scan.mutate(); };
  const active = detail.data && !detail.data.completedAt;
  const percent = detail.data?.totalExpected ? Math.round((detail.data.totalScanned / detail.data.totalExpected) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Badge tone={openAudit ? "orange" : "blue"}>{openAudit ? "Audit in progress" : "Monthly control"}</Badge><h1 className="mt-3 text-3xl font-semibold text-white">Tester audit</h1><p className="mt-2 text-sm text-zinc-400">Scan each active tester’s unique code and finish with a missing-tester report.</p></div>
        {!openAudit ? <Button disabled={user?.role !== "Manager"} isLoading={start.isPending} onClick={() => start.mutate()}><Play className="h-4 w-4" />Start audit</Button> : null}
      </header>

      {detail.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Expected units" value={detail.data.totalExpected} />
            <Metric label="Found units" value={detail.data.totalScanned} />
            <Metric label={detail.data.completedAt ? "Missing units" : "Remaining units"} value={detail.data.completedAt ? detail.data.totalMissed : Math.max(0, detail.data.totalExpected - detail.data.totalScanned)} />
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-white">Audit #{detail.data.id}</h2><p className="text-sm text-zinc-500">Started {new Date(detail.data.startedAt).toLocaleString()} by {detail.data.createdBy ?? "Unknown"}</p></div><Badge tone={active ? "orange" : "green"}>{active ? `${percent}% complete` : "Completed"}</Badge></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-green-500 transition-all" style={{ width: `${percent}%` }} /></div>
            {active ? (
              <form className="mt-5 flex flex-wrap gap-2" onSubmit={submitScan}>
                <label className="relative min-w-64 flex-1"><ScanLine className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><Input ref={inputRef} autoFocus className="w-full pl-10" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Scan unique tester code or product barcode" /></label>
                <Button isLoading={scan.isPending}>Record found</Button>
                <Button type="button" variant="secondary" disabled={user?.role !== "Manager"} isLoading={complete.isPending} onClick={() => complete.mutate()}><CheckCircle2 className="h-4 w-4" />Complete audit</Button>
              </form>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-white/10 p-5"><h2 className="font-semibold text-white">Audit checklist</h2><p className="text-sm text-zinc-500">Missing testers remain visible after completion and increase their missed-audit count.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-zinc-950 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Tester code</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Barcode</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Result</th></tr></thead><tbody>
              {detail.data.results.map((result, index) => <tr key={result.testerId} className={index % 2 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}><td className="px-4 py-3 font-medium text-white">{result.testerCode}</td><td className="px-4 py-3 text-zinc-300">{result.productName}</td><td className="px-4 py-3 text-zinc-500">{result.barcode}</td><td className="px-4 py-3 text-zinc-300">{result.quantity}</td><td className="px-4 py-3"><Badge tone={result.wasFound ? "green" : detail.data?.completedAt ? "red" : "gray"}>{result.wasFound ? "Found" : detail.data?.completedAt ? "Missing" : "Waiting"}</Badge></td></tr>)}
            </tbody></table></div>
          </Card>
        </>
      ) : (
        <Card className="p-10 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-zinc-500" /><h2 className="mt-3 font-semibold text-white">No audit selected</h2><p className="mt-1 text-sm text-zinc-500">Start the first audit or open a previous session below.</p></Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5"><h2 className="font-semibold text-white">Audit history</h2></div>
        <div className="divide-y divide-white/10">
          {audits.data?.length ? audits.data.map((audit) => <button key={audit.id} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/[0.035]" onClick={() => setSelectedId(audit.id)}><div><p className="font-medium text-white">Audit #{audit.id}</p><p className="text-xs text-zinc-500">{new Date(audit.startedAt).toLocaleString()} - {audit.createdBy ?? "Unknown"}</p></div><div className="text-right"><Badge tone={audit.completedAt ? "green" : "orange"}>{audit.completedAt ? "Completed" : "Open"}</Badge><p className="mt-1 text-xs text-zinc-500">{audit.totalScanned}/{audit.totalExpected} found</p></div></button>) : <p className="p-5 text-sm text-zinc-500">No tester audits yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}
