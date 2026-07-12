import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  AppWindow,
  Send,
  Users,
  Smartphone,
  Layers,
  Radio,
  BarChart3,
  ScrollText,
  KeyRound,
  Settings,
  Bell,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/apps', label: 'Applications', icon: AppWindow },
  { to: '/notifications', label: 'Notifications', icon: Send },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/devices', label: 'Devices', icon: Smartphone },
  { to: '/segments', label: 'Segments', icon: Layers },
  { to: '/topics', label: 'Topics', icon: Radio },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/logs', label: 'Delivery Logs', icon: ScrollText },
  { to: '/keys', label: 'API Keys', icon: KeyRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bell className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">OpenFCM</p>
              <p className="text-xs text-muted-foreground">Push Console</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">OpenFCM · Android push SaaS</p>
        </div>
      </aside>
    </>
  )
}
