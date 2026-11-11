import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, type EmployeeSummary } from "../lib/api";
import { cn } from "../lib/utils";
import { useSessionStore } from "../store/session";
import { useToastStore } from "../store/toasts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";

export function LoginPage() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const pushToast = useToastStore((state) => state.push);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [pin, setPin] = useState("");

  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees,
  });

  const firstEmployee = useMemo(() => employees.data?.[0] ?? null, [employees.data]);
  const activeEmployee = selectedEmployee ?? firstEmployee;

  const login = useMutation({
    mutationFn: () => api.login(activeEmployee!.id, pin),
    onSuccess: (sessionUser) => {
      setUser(sessionUser);
      pushToast({ title: "Signed in", description: `Welcome back, ${sessionUser.name}.`, tone: "success" });
    },
    onError: (error) => {
      setPin("");
      pushToast({ title: "Login failed", description: error.message, tone: "error" });
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeEmployee || !/^\d{4,12}$/.test(pin)) {
      pushToast({ title: "Enter a PIN of 4 to 12 digits", tone: "error" });
      return;
    }
    login.mutate();
  };

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10 text-white">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500 text-base font-bold shadow-lg shadow-blue-500/20">
            SC
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">ShipmentChecker Pro</h1>
            <p className="text-sm text-zinc-400">Retail shipment verification, fully local.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-normal text-white">Choose employee</h2>
                <p className="text-sm text-zinc-500">Session stays active until logout or app close.</p>
              </div>
              <Badge tone="blue">Local sign-in</Badge>
            </div>

            {employees.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
                ))}
              </div>
            ) : employees.isError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                Start the local demo API, then refresh this screen.
              </div>
            ) : employees.data?.length === 0 ? (
              <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">
                No local employee accounts are available. Complete the manager setup and restart the API.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {employees.data?.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setPin("");
                    }}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-blue-500/50 hover:bg-blue-500/10 active:scale-[0.99]",
                      activeEmployee?.id === employee.id && "border-blue-500/60 bg-blue-500/15",
                    )}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white">
                      {employee.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{employee.name}</p>
                      <p className="text-xs text-zinc-500">{employee.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-normal text-white">Enter PIN</h2>
            <p className="mt-1 text-sm text-zinc-500">{activeEmployee ? activeEmployee.name : "Select an employee first"}</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <Input
                  autoFocus
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="4 to 12 digit PIN"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="pl-9 text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button className="w-full" isLoading={login.isPending} disabled={!activeEmployee}>
                {login.isPending ? "Signing in" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-zinc-400">Use the PIN configured for your local account.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}
