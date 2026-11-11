import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Maximize2, Minimize2, PackagePlus, RotateCcw, ScanLine, Volume2 } from "lucide-react";
import { ItemStatus } from "../components/ShipmentStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api, type ScanResponse } from "../lib/api";
import { cn } from "../lib/utils";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

const flashStyles = {
  Matched: "border-green-500/40 bg-green-500/15 text-green-100",
  Extra: "border-orange-500/40 bg-orange-500/15 text-orange-100",
  Unknown: "border-red-500/40 bg-red-500/15 text-red-100",
  SkuSuggestion: "border-blue-500/40 bg-blue-500/15 text-blue-100",
  CatalogSuggestion: "border-orange-500/40 bg-orange-500/15 text-orange-100",
  Error: "border-red-500/40 bg-red-500/15 text-red-100",
};

export function ScanPage() {
  const shipmentId = Number(useParams().id);
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerBufferRef = useRef("");
  const scannerTimerRef = useRef<number | null>(null);
  const [barcode, setBarcode] = useState("");
  const [boxNumber, setBoxNumber] = useState("");
  const [lastResponse, setLastResponse] = useState<ScanResponse | null>(null);
  const [flashOutcome, setFlashOutcome] = useState<ScanResponse["outcome"] | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [newBoxNumber, setNewBoxNumber] = useState("");

  const acceptScanResponse = (response: ScanResponse) => {
    setLastResponse(response);
    setFlashOutcome(response.outcome);
    playScanSound(response.outcome);
    window.setTimeout(() => setFlashOutcome(null), 1500);
  };

  const shipment = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => api.shipment(shipmentId),
  });

  const boxes = useQuery({
    queryKey: ["boxes", shipmentId],
    queryFn: () => api.boxes(shipmentId),
  });

  const history = useQuery({
    queryKey: ["scan-history", shipmentId],
    queryFn: () => api.scanHistory(shipmentId),
  });

  const activeBoxNumber = boxNumber || shipment.data?.currentBoxNumber || "";

  const scan = useMutation({
    mutationFn: (payload: { barcode: string; confirmShipmentItemId?: number; confirmLogUnknown?: boolean }) =>
      api.scanShipment(shipmentId, {
        barcode: payload.barcode,
        boxNumber: activeBoxNumber,
        employeeName: user?.name,
        confirmShipmentItemId: payload.confirmShipmentItemId,
        confirmLogUnknown: payload.confirmLogUnknown,
    }),
    onSuccess: (response) => {
      acceptScanResponse(response);
      setBarcode("");
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["scan-history", shipmentId] });
      pushToast({ title: response.outcome, description: response.message, tone: response.outcome === "Unknown" ? "error" : "success" });
    },
    onError: (error) => pushToast({ title: "Scan failed", description: error.message, tone: "error" }),
  });

  const undo = useMutation({
    mutationFn: () => api.undoLastScan(shipmentId, user?.name),
    onSuccess: (response) => {
      acceptScanResponse(response);
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["scan-history", shipmentId] });
      pushToast({ title: "Undo complete", description: response.message, tone: "success" });
    },
    onError: (error) => pushToast({ title: "Undo failed", description: error.message, tone: "error" }),
  });

  const setCurrentBox = useMutation({
    mutationFn: (nextBox: string) => api.setCurrentBox(shipmentId, nextBox),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
    },
  });

  const createBox = useMutation({
    mutationFn: (nextBox: string) => api.createBox(shipmentId, nextBox),
    onSuccess: (_, nextBox) => {
      setBoxNumber(nextBox);
      setNewBoxNumber("");
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["boxes", shipmentId] });
      pushToast({ title: `Box ${nextBox} ready`, description: "Scans will be tagged to this box.", tone: "success" });
      inputRef.current?.focus();
    },
    onError: (error) => pushToast({ title: "Could not add box", description: error.message, tone: "error" }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [lastResponse]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo.mutate();
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        toggleFocusMode(setFocusMode);
        return;
      }

      const target = event.target as HTMLElement | null;
      const typingTarget = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (typingTarget || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      if (event.key === "Enter" && scannerBufferRef.current) {
        event.preventDefault();
        scan.mutate({ barcode: scannerBufferRef.current });
        scannerBufferRef.current = "";
        return;
      }

      if (event.key.length === 1) {
        scannerBufferRef.current += event.key;
        if (scannerTimerRef.current) {
          window.clearTimeout(scannerTimerRef.current);
        }
        scannerTimerRef.current = window.setTimeout(() => {
          scannerBufferRef.current = "";
        }, 90);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scan, undo]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (barcode.trim()) {
      scan.mutate({ barcode: barcode.trim() });
    }
  };

  const addBox = (event: FormEvent) => {
    event.preventDefault();
    const nextBox = newBoxNumber.trim();
    if (nextBox) {
      createBox.mutate(nextBox);
    }
  };

  const summary = lastResponse?.summary ?? shipment.data?.summary;
  const recentScans = lastResponse?.recentScans ?? history.data?.slice(0, 10) ?? [];
  const activeFlash = flashOutcome ? flashStyles[flashOutcome] : "border-white/10 bg-white/[0.035] text-white";
  const activeBox = boxes.data?.find((box) => box.boxNumber === activeBoxNumber);

  return (
    <div className={cn("space-y-5", focusMode && "fixed inset-0 z-40 overflow-auto bg-zinc-950 p-5")}>
      <div className={cn("rounded-xl border p-5 transition duration-150", activeFlash)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-wider opacity-75">Last scan</p>
          <Badge tone={flashOutcome === "Matched" ? "green" : flashOutcome === "Extra" ? "orange" : flashOutcome === "Unknown" ? "red" : "blue"}>
            {flashOutcome ?? "Ready"}
          </Badge>
        </div>
        <h1 className="mt-2 min-h-16 text-5xl font-semibold tracking-normal">
          {lastResponse?.item?.productName ?? lastResponse?.suggestedItem?.productName ?? lastResponse?.unknownItem?.barcode ?? "Ready to scan"}
        </h1>
        <p className="mt-2 text-sm opacity-80">{lastResponse?.message ?? "Use a scanner or type a barcode and press Enter."}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{shipment.data?.name ?? "Scan mode"}</h2>
              <p className="text-sm text-zinc-500">
                Currently scanning: {activeBoxNumber ? `Box ${activeBoxNumber}` : "No box selected"}
                {activeBox ? ` (${activeBox.scannedQuantity}/${activeBox.expectedQuantity})` : ""}
              </p>
            </div>
            <Link className="text-sm text-blue-300 hover:text-blue-200" to={`/shipments/${shipmentId}`}>Shipment detail</Link>
          </div>

          <form className="flex gap-3" onSubmit={submit}>
            <Input
              ref={inputRef}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Scan barcode"
              className="h-14 text-xl"
            />
            <Button isLoading={scan.isPending} className="h-14">
              <ScanLine className="h-4 w-4" />
              Scan
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Box</span>
              <select
                className="h-10 rounded-lg border border-white/10 bg-zinc-950/70 px-3 text-sm text-white outline-none"
                value={activeBoxNumber}
                onChange={(event) => {
                  setBoxNumber(event.target.value);
                  if (event.target.value) {
                    setCurrentBox.mutate(event.target.value);
                  }
                }}
              >
                <option value="">Select box</option>
                {boxes.data?.map((box) => (
                  <option key={box.boxNumber} value={box.boxNumber}>
                    Box {box.boxNumber}
                  </option>
                ))}
              </select>
            </label>
            <form className="flex items-end gap-2" onSubmit={addBox}>
              <label>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Add/use box</span>
                <Input
                  value={newBoxNumber}
                  onChange={(event) => setNewBoxNumber(event.target.value)}
                  placeholder="4, 5, 6..."
                  className="h-10 w-36"
                />
              </label>
              <Button type="submit" variant="secondary" isLoading={createBox.isPending}>
                <PackagePlus className="h-4 w-4" />
                Add
              </Button>
            </form>
            <Button type="button" variant="secondary" onClick={() => undo.mutate()} isLoading={undo.isPending}>
              <RotateCcw className="h-4 w-4" />
              Undo last
            </Button>
            <Button type="button" variant="secondary" onClick={() => toggleFocusMode(setFocusMode)}>
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              Full screen
            </Button>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-400">
              <Volume2 className="h-4 w-4" />
              Audio on scan
            </div>
          </div>

          {lastResponse?.outcome === "SkuSuggestion" && lastResponse.suggestedItem ? (
            <SuggestionPanel
              title="SKU fallback"
              text={`Did you mean ${lastResponse.suggestedItem.productName}?`}
              onConfirm={() => scan.mutate({ barcode: lastResponse.suggestedItem!.barcode, confirmShipmentItemId: lastResponse.suggestedItem!.id })}
              confirmLabel="Confirm match"
            />
          ) : null}

          {lastResponse?.outcome === "CatalogSuggestion" && lastResponse.catalogSuggestion ? (
            <SuggestionPanel
              title="Previous catalog match"
              text={`${lastResponse.catalogSuggestion.productName} is not in this shipment.`}
              onConfirm={() => scan.mutate({ barcode: lastResponse.catalogSuggestion!.barcode, confirmLogUnknown: true })}
              confirmLabel="Log as unknown"
            />
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Live counters</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Counter label="Expected" value={summary?.totalExpected ?? 0} />
            <Counter label="Scanned" value={summary?.totalScanned ?? 0} />
            <Counter label="Matched" value={summary?.matchedUnits ?? 0} />
            <Counter label="Missing" value={summary?.missingUnits ?? 0} tone="red" />
            <Counter label="Extra" value={summary?.extraUnits ?? 0} tone="orange" />
            <Counter label="Unknown" value={summary?.unknownUnits ?? 0} tone="red" />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white">Last 10 scans</h2>
        <div className="mt-3 max-h-80 space-y-2 overflow-auto">
          {recentScans.length === 0 ? <p className="text-sm text-zinc-500">No scans yet.</p> : null}
          {recentScans.map((scanItem) => (
            <div key={scanItem.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">{scanItem.productName ?? scanItem.barcode}</p>
                <p className="text-xs text-zinc-500">{scanItem.barcode} - Box {scanItem.boxNumber ?? "none"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{new Date(scanItem.scanTime).toLocaleTimeString()}</span>
                <ItemStatus status={scanItem.actionType === "Unknown" ? "Missing" : scanItem.actionType === "Undo" ? "Extra" : "Matched"} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Counter({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "red" | "orange" }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", tone === "red" ? "text-red-300" : tone === "orange" ? "text-orange-300" : "text-white")}>{value}</p>
    </div>
  );
}

function SuggestionPanel({ title, text, onConfirm, confirmLabel }: { title: string; text: string; onConfirm: () => void; confirmLabel: string }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge tone="blue">{title}</Badge>
          <p className="mt-2 text-sm text-blue-100">{text}</p>
        </div>
        <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
}

function toggleFocusMode(setFocusMode: (updater: (value: boolean) => boolean) => void) {
  setFocusMode((value) => !value);
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => undefined);
  } else {
    document.exitFullscreen().catch(() => undefined);
  }
}

function playScanSound(outcome: ScanResponse["outcome"]) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const playTone = (frequency: number, start: number, duration: number, type: OscillatorType = "sine") => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + start);
    oscillator.stop(context.currentTime + start + duration + 0.02);
  };

  if (outcome === "Matched") {
    playTone(440, 0, 0.12);
  } else if (outcome === "Extra" || outcome === "CatalogSuggestion" || outcome === "SkuSuggestion") {
    playTone(520, 0, 0.08);
    playTone(660, 0.12, 0.08);
  } else {
    playTone(200, 0, 0.3, "sawtooth");
  }

  window.setTimeout(() => context.close().catch(() => undefined), 600);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
