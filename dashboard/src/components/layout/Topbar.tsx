import { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppSwitcher } from './AppSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/store/auth'
import { authApi } from '@/api/auth'
import { initials, cn } from '@/lib/utils'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, clear } = useAuth()
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

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clear()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:gap-3 sm:px-4 lg:px-6">
      <button
        onClick={onMenu}
        className="shrink-0 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AppSwitcher />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <ThemeToggle />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className={cn(
              'flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
              open && 'bg-muted',
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/75 text-xs font-semibold text-primary-foreground shadow-soft">
              {initials(user?.name)}
            </span>
            <span className="hidden text-sm font-medium sm:block">{user?.name ?? 'Account'}</span>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-muted-foreground transition-transform duration-150 sm:block',
                open && 'rotate-180',
              )}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-56 max-w-[calc(100vw-1.5rem)] origin-top-right animate-dropdown-in rounded-xl border border-border bg-card p-1.5 shadow-overlay">
              <div className="px-2 py-2">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="border-t border-border pt-1">
                <button
                  onClick={() => {
                    setOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" /> Account settings
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
