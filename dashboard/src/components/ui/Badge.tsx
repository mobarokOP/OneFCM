import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'muted'

const tones: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/70',
  primary: 'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/15',
  success:
    'bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/25',
  warning:
    'bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/25',
  danger:
    'bg-red-500/10 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/25',
  info: 'bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/25',
  violet:
    'bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-400 dark:ring-violet-400/25',
  muted: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/70',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

const statusMap: Record<string, Tone> = {
  active: 'success',
  sent: 'success',
  delivered: 'success',
  queued: 'info',
  sending: 'info',
  scheduled: 'violet',
  paused: 'warning',
  failed: 'danger',
  disabled: 'danger',
  canceled: 'muted',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = statusMap[status?.toLowerCase()] ?? 'default'
  return (
    <Badge tone={tone} className="capitalize">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      {status}
    </Badge>
  )
}
