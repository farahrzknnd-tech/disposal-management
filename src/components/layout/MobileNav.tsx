import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  Table2,
  Layers,
  Activity,
  ClipboardList,
  BarChart3,
  PieChart,
  Database,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Input Surat Jalan', to: '/surat-jalan/input', icon: FilePlus2 },
      { label: 'Data Surat Jalan', to: '/surat-jalan', icon: Table2 },
      { label: 'Batch Pengiriman', to: '/batch', icon: Layers },
      { label: 'Monitoring Proses', to: '/monitoring', icon: Activity },
      { label: 'SPK', to: '/spk', icon: ClipboardList },
    ],
  },
  {
    title: 'Laporan',
    items: [
      { label: 'Rekap Cluster', to: '/rekap-cluster', icon: BarChart3 },
      { label: 'Analisa', to: '/analisa', icon: PieChart },
    ],
  },
  {
    title: 'Pengaturan',
    items: [{ label: 'Master Data', to: '/master', icon: Database }],
  },
];

const bottomItem: NavItem = { label: 'Pengaturan', to: '/pengaturan', icon: Settings };

export function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Debris Disposal</span>
          <span className="text-[11px] text-muted-foreground">Management System</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
        <div className="border-t border-border pt-3">
          <NavLink
            to={bottomItem.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <bottomItem.icon className="h-4 w-4" />
            <span>{bottomItem.label}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
