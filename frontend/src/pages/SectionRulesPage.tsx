import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, Pencil, Plus, Power, Search, Trash2, X } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api, type ClassificationResult, type SectionRule, type UpsertSectionRule } from "../lib/api";
import { cn } from "../lib/utils";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";

const emptyForm: UpsertSectionRule = {
  keyword: "",
  mainSection: "",
  category: "",
  subCategory: "",
  priority: 10,
  isActive: true,
};

export function SectionRulesPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [editingRule, setEditingRule] = useState<SectionRule | null>(null);
  const [form, setForm] = useState<UpsertSectionRule>(emptyForm);
  const [productName, setProductName] = useState("Demo Notebook");
  const [classification, setClassification] = useState<ClassificationResult | null>(null);

  const rules = useQuery({
    queryKey: ["section-rules"],
    queryFn: api.sectionRules,
  });

  const sortedRules = useMemo(() => rules.data ?? [], [rules.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["section-rules"] });

  const createRule = useMutation({
    mutationFn: api.createSectionRule,
    onSuccess: () => {
      setForm(emptyForm);
      invalidate();
      pushToast({ title: "Rule added", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not add rule", description: error.message, tone: "error" }),
  });

  const updateRule = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: UpsertSectionRule }) => api.updateSectionRule(id, rule),
    onSuccess: () => {
      setEditingRule(null);
      setForm(emptyForm);
      invalidate();
      pushToast({ title: "Rule updated", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not update rule", description: error.message, tone: "error" }),
  });

  const deleteRule = useMutation({
    mutationFn: api.deleteSectionRule,
    onSuccess: () => {
      invalidate();
      pushToast({ title: "Rule deleted", tone: "success" });
    },
    onError: (error) => pushToast({ title: "Could not delete rule", description: error.message, tone: "error" }),
  });

  const reorderRule = useMutation({
    mutationFn: api.reorderSectionRules,
    onSuccess: invalidate,
    onError: (error) => pushToast({ title: "Could not reorder rules", description: error.message, tone: "error" }),
  });

  const testClassification = useMutation({
    mutationFn: () => api.testClassification(productName),
    onSuccess: setClassification,
    onError: (error) => pushToast({ title: "Classification failed", description: error.message, tone: "error" }),
  });

  const canManage = user?.role === "Manager";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, createdBy: user?.name ?? "Manager" };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, rule: payload });
    } else {
      createRule.mutate(payload);
    }
  };

  const edit = (rule: SectionRule) => {
    setEditingRule(rule);
    setForm({
      keyword: rule.keyword,
      mainSection: rule.mainSection,
      category: rule.category,
      subCategory: rule.subCategory,
      priority: rule.priority,
      isActive: rule.isActive,
      createdBy: rule.createdBy,
    });
  };

  const move = (rule: SectionRule, direction: "up" | "down") => {
    const index = sortedRules.findIndex((item) => item.id === rule.id);
    const target = direction === "up" ? sortedRules[index - 1] : sortedRules[index + 1];
    if (!target) {
      return;
    }

    reorderRule.mutate([
      { id: rule.id, priority: target.priority },
      { id: target.id, priority: rule.priority },
    ]);
  };

  const toggleActive = (rule: SectionRule) => {
    updateRule.mutate({
      id: rule.id,
      rule: {
        keyword: rule.keyword,
        mainSection: rule.mainSection,
        category: rule.category,
        subCategory: rule.subCategory,
        priority: rule.priority,
        isActive: !rule.isActive,
        createdBy: rule.createdBy,
      },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="blue">Priority classification</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Section rules</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Products classify into MainSection, Category, and SubCategory. Lower priority numbers win, and the first active match is used.
          </p>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{editingRule ? "Edit rule" : "Add rule"}</h2>
                <p className="text-sm text-zinc-500">Keywords may be comma-separated aliases.</p>
              </div>
              {editingRule ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingRule(null);
                    setForm(emptyForm);
                  }}
                  title="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Field label="Keyword">
                <Input value={form.keyword} onChange={(event) => setForm({ ...form, keyword: event.target.value })} placeholder="notebook, stationery" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="MainSection">
                  <Input value={form.mainSection} onChange={(event) => setForm({ ...form, mainSection: event.target.value })} placeholder="Collectibles" />
                </Field>
                <Field label="Category">
                  <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Blind Box" />
                </Field>
              </div>
              <Field label="SubCategory">
                <Input value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })} placeholder="General" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Priority">
                  <Input
                    min={1}
                    type="number"
                    value={form.priority}
                    onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
                  />
                </Field>
                <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-300">
                  <input
                    checked={form.isActive}
                    className="h-4 w-4 accent-blue-500"
                    type="checkbox"
                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  />
                  Active
                </label>
              </div>
              <Button className="w-full" disabled={!canManage} isLoading={createRule.isPending || updateRule.isPending}>
                {editingRule ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingRule ? "Save rule" : "Add rule"}
              </Button>
              {!canManage ? <p className="text-xs text-orange-300">Manager role required to edit rules.</p> : null}
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white">Test product name</h2>
            <div className="mt-4 flex gap-2">
              <Input value={productName} onChange={(event) => setProductName(event.target.value)} />
              <Button type="button" isLoading={testClassification.isPending} onClick={() => testClassification.mutate()}>
                <Search className="h-4 w-4" />
                Test
              </Button>
            </div>
            {classification ? (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium text-white">
                  {classification.mainSection} <span className="text-zinc-500">&gt;</span> {classification.category}{" "}
                  <span className="text-zinc-500">&gt;</span> {classification.subCategory}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {classification.matchedRuleId ? `Matched rule #${classification.matchedRuleId} via "${classification.matchedKeyword}"` : "No rule matched; fallback used."}
                </p>
              </div>
            ) : null}
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-lg font-semibold text-white">Rules</h2>
            <p className="text-sm text-zinc-500">Priority order controls classification precedence.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Hierarchy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.isLoading
                  ? Array.from({ length: 8 }).map((_, index) => (
                      <tr key={index} className="border-t border-white/10">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-8 animate-pulse rounded bg-white/[0.04]" />
                        </td>
                      </tr>
                    ))
                  : sortedRules.map((rule, index) => (
                      <tr key={rule.id} className={cn("border-t border-white/10 transition hover:bg-white/[0.035]", index % 2 === 1 && "bg-white/[0.02]")}>
                        <td className="px-4 py-3 font-medium text-white">{rule.priority}</td>
                        <td className="px-4 py-3 text-zinc-300">{rule.keyword}</td>
                        <td className="px-4 py-3">
                          <Badge tone="blue">{rule.mainSection}</Badge>
                          <span className="mx-2 text-zinc-600">&gt;</span>
                          <span className="text-zinc-300">{rule.category}</span>
                          <span className="mx-2 text-zinc-600">&gt;</span>
                          <span className="text-zinc-400">{rule.subCategory}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={rule.isActive ? "green" : "gray"}>{rule.isActive ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconButton title="Move up" disabled={!canManage || index === 0} onClick={() => move(rule, "up")} icon={<ArrowUp className="h-4 w-4" />} />
                            <IconButton title="Move down" disabled={!canManage || index === sortedRules.length - 1} onClick={() => move(rule, "down")} icon={<ArrowDown className="h-4 w-4" />} />
                            <IconButton title={rule.isActive ? "Disable" : "Enable"} disabled={!canManage} onClick={() => toggleActive(rule)} icon={<Power className="h-4 w-4" />} />
                            <IconButton title="Edit" disabled={!canManage} onClick={() => edit(rule)} icon={<Pencil className="h-4 w-4" />} />
                            <IconButton title="Delete" disabled={!canManage} onClick={() => deleteRule.mutate(rule.id)} icon={<Trash2 className="h-4 w-4" />} />
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
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

function IconButton({ icon, title, disabled, onClick }: { icon: ReactNode; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="icon" variant="ghost" disabled={disabled} title={title} onClick={onClick}>
      {icon}
    </Button>
  );
}
