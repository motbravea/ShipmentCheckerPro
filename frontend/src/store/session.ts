import { create } from "zustand";
import type { SessionUser } from "../lib/api";

type Theme = "dark" | "light";

type SessionState = {
  user: SessionUser | null;
  theme: Theme;
  setUser: (user: SessionUser) => void;
  logout: () => void;
  toggleTheme: () => void;
};

const storedUser = sessionStorage.getItem("shipmentchecker-demo:user");
const storedTheme = (localStorage.getItem("shipmentchecker-demo:theme") as Theme | null) ?? "dark";

export const useSessionStore = create<SessionState>((set, get) => ({
  user: storedUser ? (JSON.parse(storedUser) as SessionUser) : null,
  theme: storedTheme,
  setUser: (user) => {
    sessionStorage.setItem("shipmentchecker-demo:user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    sessionStorage.removeItem("shipmentchecker-demo:user");
    set({ user: null });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("shipmentchecker-demo:theme", next);
    set({ theme: next });
  },
}));
