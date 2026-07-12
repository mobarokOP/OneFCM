import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="relative mb-4">
          {/* Soft radial glow behind the icon */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.12),transparent)]"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-soft ring-1 ring-inset ring-primary/10">
            <Icon className="h-7 w-7" />
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
