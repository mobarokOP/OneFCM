import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApps } from '@/hooks/useApps'
import { useSelectedApp } from '@/store/app'
import { cn } from '@/lib/utils'

export function AppSwitcher() {
  const { data: apps = [], isLoading } = useApps()
  const { selectedAppId, setSelectedAppId } = useSelectedApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const current = apps.find((a) => a.id === selectedAppId) ?? apps[0]

  return (
    // Mobile: flex-1 + min-w-0 lets the switcher shrink and truncate so the
    // topbar never overflows; desktop keeps its content-sized width.
    <div className="relative min-w-0 flex-1 sm:max-w-xs sm:flex-initial" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm transition-[background-color,border-color,box-shadow] duration-150 hover:border-muted-foreground/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] sm:min-w-[180px]',
          open && 'border-ring ring-2 ring-ring/25',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/75 text-xs font-semibold text-primary-foreground">
            {current?.name?.[0]?.toUpperCase() ?? '·'}
          </span>
          <span className="truncate font-medium">
            {isLoading ? 'Loading…' : current?.name ?? 'No application'}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] origin-top-left animate-dropdown-in rounded-xl border border-border bg-card p-1.5 shadow-overlay">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Applications
          </p>
          <div className="max-h-64 overflow-y-auto">
            {apps.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No applications yet.</p>
            )}
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  setSelectedAppId(app.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  app.id === current?.id && 'bg-accent/60',
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/75 text-xs font-semibold text-primary-foreground">
                  {app.name[0]?.toUpperCase()}
                </span>
                <span className="flex-1 truncate">
                  <span className="block truncate font-medium">{app.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{app.package_name}</span>
                </span>
                {app.id === current?.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/apps')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LayoutGrid className="h-4 w-4" /> Manage applications
            </button>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/apps?new=1')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-primary transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" /> New application
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
