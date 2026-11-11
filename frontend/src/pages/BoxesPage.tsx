import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, PackagePlus, ScanLine } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

export function BoxesPage() {
  const shipmentId = Number(useParams().id);
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const queryClient = useQueryClient();
  const [boxNumber, setBoxNumber] = useState("");

  const boxes = useQuery({
    queryKey: ["boxes", shipmentId],
    queryFn: () => api.boxes(shipmentId),
  });

  const complete = useMutation({
    mutationFn: (boxNumber: string) => api.completeBox(shipmentId, boxNumber, user?.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
      pushToast({ title: "Box marked complete", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not complete box", description: error.message, tone: "error" }),
  });

  const createBox = useMutation({
    mutationFn: (nextBox: string) => api.createBox(shipmentId, nextBox),
    onSuccess: (_, nextBox) => {
      setBoxNumber("");
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      pushToast({ title: `Box ${nextBox} added`, description: "It is now available in scan mode.", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not add box", description: error.message, tone: "error" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextBox = boxNumber.trim();
    if (nextBox) {
      createBox.mutate(nextBox);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-white">Per-box progress</h1>
        <p className="mt-2 text-sm text-zinc-400">Each box is tracked separately from expected Excel rows and actual scans.</p>
      </header>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
            <label>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Add box</span>
              <Input
                value={boxNumber}
                onChange={(event) => setBoxNumber(event.target.value)}
                placeholder="4, 5, 6..."
                className="w-44"
              />
            </label>
            <Button type="submit" isLoading={createBox.isPending}>
              <PackagePlus className="h-4 w-4" />
              Add box
            </Button>
          </form>
          <Link to={`/shipments/${shipmentId}/scan`}>
            <Button variant="secondary">
              <ScanLine className="h-4 w-4" />
              Scan mode
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Scanned</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {boxes.data?.map((box, index) => (
                <tr key={box.boxNumber} className={index % 2 === 1 ? "border-t border-white/10 bg-white/[0.02]" : "border-t border-white/10"}>
                  <td className="px-4 py-3 font-medium text-white">{box.boxNumber}</td>
                  <td className="px-4 py-3 text-zinc-300">{box.expectedQuantity}</td>
                  <td className="px-4 py-3 text-zinc-300">{box.scannedQuantity}</td>
                  <td className="px-4 py-3 text-red-300">{box.missingQuantity}</td>
                  <td className="px-4 py-3 text-orange-300">{box.extraQuantity}</td>
                  <td className="px-4 py-3"><Badge tone={box.isComplete ? "green" : "blue"}>{box.isComplete ? "Complete" : "Open"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" disabled={box.isComplete} onClick={() => complete.mutate(box.boxNumber)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
