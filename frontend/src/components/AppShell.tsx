import { type ReactNode, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { navGroups } from "../data/navigation";
import { cn } from "../lib/utils";
import { useSessionStore } from "../store/session";
import { Button } from "./ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const theme = useSessionStore((state) => state.theme);
  const logout = useSessionStore((state) => state.logout);
  const toggleTheme = useSessionStore((state) => state.toggleTheme);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={cn(
        "min-h-screen text-zinc-100",
        theme === "light" && "bg-zinc-100 text-zinc-950",
      )}
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-zinc-950/75 p-4 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2 pt-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              SC
            </div>
            <div>
              <p className="text-sm font-semibold text-white">ShipmentChecker Pro</p>
              <p className="text-xs text-zinc-500">Local retail operations</p>
            </div>
          </div>

          <nav className="flex-1 space-y-6">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/6 hover:text-white",
                            isActive && "bg-white/10 text-white shadow-sm",
                          )
                        }
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-green-500/15 text-sm font-semibold text-green-300">
                {user?.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-zinc-500">{user?.role}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={toggleTheme} title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleLogout} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="mx-auto w-full max-w-7xl px-5 py-5 lg:px-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
