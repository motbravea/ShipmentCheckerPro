import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, History, Save } from "lucide-react";
import { TesterStatus } from "../components/TesterStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

const lifecycleStatuses = ["Active", "Inactive", "Damaged", "Lost", "Stolen", "Replaced"];

export function TesterDetailPage() {
  const { id } = useParams();
  const testerId = Number(id);
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [status, setStatus] = useState("Inactive");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const tester = useQuery({ queryKey: ["tester", testerId], queryFn: () => api.tester(testerId), enabled: Number.isFinite(testerId) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tester", testerId] });
    queryClient.invalidateQueries({ queryKey: ["testers"] });
  };
  const approve = useMutation({
    mutationFn: () => api.approveTester(testerId, user?.name),
    onSuccess: () => { refresh(); pushToast({ title: "Tester approved", tone: "success" }); },
    onError: (error) => pushToast({ title: "Approval failed", description: error.message, tone: "error" }),
  });
  const changeStatus = useMutation({
    mutationFn: () => api.updateTesterStatus(testerId, { status, reason, notes, changedBy: user?.name }),
    onSuccess: () => { setReason(""); setNotes(""); refresh(); pushToast({ title: "Tester status updated", tone: "success" }); },
    onError: (error) => pushToast({ title: "Status update failed", description: error.message, tone: "error" }),
  });

  if (tester.isLoading) return <div className="text-sm text-zinc-500">Loading tester...</div>;
  if (!tester.data) return <Card className="p-5 text-sm text-red-300">Tester could not be loaded.</Card>;
  const item = tester.data;
  const canManage = user?.role === "Manager";
  const submitStatus = (event: FormEvent) => { event.preventDefault(); changeStatus.mutate(); };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white" to="/testers"><ArrowLeft className="h-4 w-4" />All testers</Link>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold text-white">{item.testerCode}</h1><TesterStatus status={item.status} /></div>
          <p className="mt-2 text-zinc-300">{item.productName}</p>
        </div>
        {item.status === "Pending Approval" ? (
          <Button disabled={!canManage} isLoading={approve.isPending} onClick={() => approve.mutate()}><CheckCircle2 className="h-4 w-4" />Approve tester</Button>
        ) : null}
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white">Tester record</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Info label="Product barcode" value={item.barcode} />
              <Info label="SKU" value={item.sku ?? "Not set"} />
              <Info label="Quantity" value={String(item.quantity)} />
              <Info label="Created" value={new Date(item.createdAt).toLocaleString()} />
              <Info label="Created by" value={item.createdBy ?? "Unknown"} />
              <Info label="Approved by" value={item.approvedBy ?? "Not approved"} />
              <Info label="Last seen" value={item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : "Never"} />
              <Info label="Last audit" value={item.lastAuditAt ? new Date(item.lastAuditAt).toLocaleString() : "Never"} />
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-xs uppercase text-zinc-500">Product hierarchy</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="blue">{item.mainSection}</Badge><span className="text-zinc-600">&gt;</span><span className="text-sm text-zinc-300">{item.category}</span><span className="text-zinc-600">&gt;</span><span className="text-sm text-zinc-400">{item.subCategory}</span></div>
            </div>
            {item.notes ? <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">{item.notes}</p> : null}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 p-5"><History className="h-5 w-5 text-blue-400" /><div><h2 className="font-semibold text-white">Lifecycle history</h2><p className="text-sm text-zinc-500">Status changes cannot be overwritten.</p></div></div>
            <div className="divide-y divide-white/10">
              {item.history.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2">{entry.oldStatus ? <TesterStatus status={entry.oldStatus} /> : null}<span className="text-zinc-600">&gt;</span><TesterStatus status={entry.newStatus} /></div><span className="text-xs text-zinc-500">{new Date(entry.changedAt).toLocaleString()}</span></div>
                  <p className="mt-2 text-sm text-zinc-300">{entry.reason}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.changedBy ?? "Unknown"}{entry.notes ? ` - ${entry.notes}` : ""}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="text-lg font-semibold text-white">Change lifecycle status</h2>
          <p className="mt-1 text-sm text-zinc-500">Use this when a tester is removed, damaged, lost, stolen, or replaced.</p>
          <form className="mt-5 space-y-3" onSubmit={submitStatus}>
            <select className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white" value={status} onChange={(event) => setStatus(event.target.value)}>
              {lifecycleStatuses.filter((option) => option !== item.status).map((option) => <option key={option}>{option}</option>)}
            </select>
            <Input required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for this change" />
            <textarea className="min-h-24 w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-blue-500" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" />
            <Button className="w-full" disabled={!canManage || item.status === "Pending Approval"} isLoading={changeStatus.isPending}><Save className="h-4 w-4" />Save status</Button>
            {!canManage ? <p className="text-xs text-orange-300">Manager role required.</p> : null}
            {item.status === "Pending Approval" ? <p className="text-xs text-orange-300">Approve this tester before changing its lifecycle status.</p> : null}
          </form>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-1 text-sm text-zinc-200">{value}</p></div>;
}
