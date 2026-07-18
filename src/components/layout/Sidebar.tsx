import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileText, Package, FileSignature, Activity,
  BarChart3, TrendingUp, Gauge, ClipboardList, Download, History,
  Database, Settings, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Surat Jalan", path: "/surat-jalan", icon: FileText },
  { label: "Batch Pengiriman", path: "/batch", icon: Package },
  { label: "SPK", path: "/spk", icon: FileSignature },
  { label: "Monitoring", path: "/monitoring", icon: Activity },
  { label: "Rekap Cluster", path: "/rekap-cluster", icon: BarChart3 },
  { label: "Analisa", path: "/analisa", icon: TrendingUp },
  { label: "Performance", path: "/performance", icon: Gauge },
  { label: "Laporan", path: "/laporan", icon: ClipboardList },
  { label: "Export Center", path: "/export", icon: Download },
  { label: "Audit Log", path: "/audit-log", icon: History },
  { label: "Master Data", path: "/master-data", icon: Database },
  { label: "Pengaturan", path: "/pengaturan", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Debris Disposal</p>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto h-[calc(100%-4rem)] scrollbar-thin">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
