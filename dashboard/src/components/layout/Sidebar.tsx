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

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    label: null,
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/apps', label: 'Applications', icon: AppWindow },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Send },
      { to: '/segments', label: 'Segments', icon: Layers },
      { to: '/topics', label: 'Topics', icon: Radio },
    ],
  },
  {
    label: 'Audience',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/devices', label: 'Devices', icon: Smartphone },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/logs', label: 'Delivery Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/keys', label: 'API Keys', icon: KeyRound },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Bell className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">OpenFCM</p>
              <p className="text-xs text-muted-foreground">Push Console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {sections.map((section, i) => (
            <div key={section.label ?? i}>
              {section.label && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Animated active indicator bar */}
                        <span
                          aria-hidden
                          className={cn(
                            'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-200 ease-out',
                            isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
                          )}
                        />
                        <item.icon
                          className={cn(
                            'h-5 w-5 shrink-0 transition-colors duration-150',
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">OpenFCM · Android push SaaS</p>
        </div>
      </aside>
    </>
  )
}
