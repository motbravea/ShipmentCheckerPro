import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, ShieldPlus } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api, type CreateTester, type ProductLookup } from "../lib/api";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

const initialForm: CreateTester = { testerCode: "", barcode: "", productName: "", chineseProductName: "", sku: "", quantity: 1, notes: "" };

export function NewTesterPage() {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [form, setForm] = useState(initialForm);
  const [lookup, setLookup] = useState<ProductLookup | null>(null);

  const productLookup = useMutation({
    mutationFn: () => api.lookupTesterProduct(form.barcode),
    onSuccess: (product) => {
      setLookup(product);
      setForm((current) => ({ ...current, productName: product.productName, chineseProductName: product.chineseProductName ?? "", sku: product.sku ?? "" }));
      pushToast({ title: "Product found", description: "Catalog details filled in.", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Product not found", description: error.message, tone: "error" }),
  });

  const create = useMutation({
    mutationFn: api.createTester,
    onSuccess: (tester) => {
      pushToast({ title: "Tester created", description: "It is waiting for manager approval.", tone: "success" });
      navigate(`/testers/${tester.id}`);
    },
    onError: (error) => pushToast({ title: "Could not create tester", description: error.message, tone: "error" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ ...form, createdBy: user?.name });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <Badge tone="orange">Pending approval</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white">Create tester</h1>
        <p className="mt-2 text-sm text-zinc-400">Use a unique tester code. Scan the product barcode to reuse its catalog information.</p>
      </header>

      <form className="grid gap-4 lg:grid-cols-[1fr_0.7fr]" onSubmit={submit}>
        <Card className="space-y-4 p-5">
          <Field label="Unique tester code">
            <Input required value={form.testerCode} onChange={(event) => setForm({ ...form, testerCode: event.target.value })} placeholder="TST-0001" />
          </Field>
          <Field label="Product barcode">
            <div className="flex gap-2">
              <Input required className="min-w-0 flex-1" value={form.barcode} onChange={(event) => { setLookup(null); setForm({ ...form, barcode: event.target.value }); }} placeholder="Scan or enter barcode" />
              <Button type="button" variant="secondary" isLoading={productLookup.isPending} disabled={!form.barcode.trim()} onClick={() => productLookup.mutate()}>
                <Search className="h-4 w-4" />Lookup
              </Button>
            </div>
          </Field>
          <Field label="Product name">
            <Input required value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU"><Input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></Field>
            <Field label="Quantity"><Input min={1} required type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></Field>
          </div>
          <Field label="Chinese product name"><Input value={form.chineseProductName} onChange={(event) => setForm({ ...form, chineseProductName: event.target.value })} /></Field>
          <Field label="Notes">
            <textarea className="min-h-24 w-full rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm text-white outline-none focus:border-blue-500" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
          <Button className="w-full" isLoading={create.isPending}><ShieldPlus className="h-4 w-4" />Create pending tester</Button>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-semibold text-white">Classification</h2>
          {lookup ? (
            <div className="mt-4">
              <Badge tone="blue">{lookup.mainSection}</Badge>
              <p className="mt-3 text-sm text-zinc-300">{lookup.category} &gt; {lookup.subCategory}</p>
              <p className="mt-3 text-xs text-zinc-500">Inherited from the product catalog.</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Lookup a known barcode to preview its hierarchy. New products will pass through the section-rule engine when created.</p>
          )}
        </Card>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium uppercase text-zinc-500">{label}</span>{children}</label>;
}
