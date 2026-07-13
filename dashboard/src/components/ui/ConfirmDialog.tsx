import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' (red, destructive) or 'default' (primary). */
  tone?: 'danger' | 'default'
  icon?: 'trash' | 'warning' | 'shield'
}

type Confirmer = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirmer | null>(null)

/** Promise-based confirmation dialog styled to the design system. */
export function useConfirm(): Confirmer {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return ctx
}

const icons = {
  trash: Trash2,
  warning: AlertTriangle,
  shield: ShieldAlert,
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<Confirmer>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOptions(null)
  }

  // While open: lock body scroll and close on Escape regardless of focus.
  const isOpen = options !== null
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resolver.current?.(false)
        resolver.current = null
        setOptions(null)
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  const tone = options?.tone ?? 'danger'
  const Icon = icons[options?.icon ?? (tone === 'danger' ? 'trash' : 'warning')]

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="fixed inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" onClick={() => close(false)} aria-hidden />
            <div
              role="alertdialog"
              aria-modal="true"
              className="relative z-10 max-h-[85dvh] w-full max-w-sm animate-scale-in overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-overlay sm:p-6"
            >
              <div
                className={cn(
                  'mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-8',
                  tone === 'danger' ? 'ring-red-500/5' : 'ring-primary/5',
                  tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary',
                )}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-center text-lg font-semibold">{options.title}</h2>
              {options.description && (
                <p className="mt-1.5 text-center text-sm text-muted-foreground">{options.description}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => close(false)}>
                  {options.cancelLabel ?? 'Cancel'}
                </Button>
                <Button
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  autoFocus
                  onClick={() => close(true)}
                >
                  {options.confirmLabel ?? 'Confirm'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  )
}
