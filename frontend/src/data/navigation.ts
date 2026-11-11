import {
  Archive,
  BarChart3,
  FileDown,
  Home,
  PackagePlus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";

export const navGroups = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", path: "/", icon: Home },
      { label: "New Shipment", path: "/shipments/new", icon: PackagePlus },
      { label: "Archive", path: "/shipments/archive", icon: Archive },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Testers", path: "/testers", icon: ShieldCheck },
      { label: "Tester Audit", path: "/testers/audit", icon: Users },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "Export Center", path: "/export", icon: FileDown },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Section Rules", path: "/settings/sections", icon: SlidersHorizontal },
      { label: "Employees", path: "/settings/employees", icon: Users },
    ],
  },
];
