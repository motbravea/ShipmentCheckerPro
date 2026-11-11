import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api, type CreateShipment } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

const initialForm: CreateShipment = {
  name: "",
  orderNumber: "",
  orderReference: "",
  storeName: "",
  storeCode: "",
  supplierName: "",
  notes: "",
};

export function NewShipmentPage() {
  const [form, setForm] = useState<CreateShipment>(initialForm);
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);

  const createShipment = useMutation({
    mutationFn: api.createShipment,
    onSuccess: (shipment) => {
      pushToast({ title: "Shipment created", description: shipment.name, tone: "success" });
      navigate(`/shipments/${shipment.id}/import`);
    },
    onError: (error) => pushToast({ title: "Could not create shipment", description: error.message, tone: "error" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createShipment.mutate({ ...form, createdBy: user?.name });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-white">New shipment</h1>
        <p className="mt-2 text-sm text-zinc-400">Create the cycle first, then import the shipment workbook.</p>
      </header>

      <Card className="p-5">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Shipment name">
            <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Week 7 Shipment" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Order number">
              <Input value={form.orderNumber} onChange={(event) => setForm({ ...form, orderNumber: event.target.value })} />
            </Field>
            <Field label="Order reference">
              <Input value={form.orderReference} onChange={(event) => setForm({ ...form, orderReference: event.target.value })} />
            </Field>
            <Field label="Store name">
              <Input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} />
            </Field>
            <Field label="Supplier">
              <Input value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button className="justify-self-start" isLoading={createShipment.isPending}>
            <PackagePlus className="h-4 w-4" />
            Create shipment
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
