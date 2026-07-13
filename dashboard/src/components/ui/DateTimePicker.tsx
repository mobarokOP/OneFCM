import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  /** 'YYYY-MM-DDTHH:mm' (same shape as <input type="datetime-local">). */
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

const toValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Design-system date & time picker (calendar + time + quick presets). */
export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time' }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => (value ? new Date(value) : null), [value])
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth())

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Jump the calendar to the selected month when opening.
  useEffect(() => {
    if (open) {
      const base = selected ?? new Date()
      setViewYear(base.getFullYear())
      setViewMonth(base.getMonth())
    }
  }, [open, selected])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysGrid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const start = first.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < start; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))
    return cells
  }, [viewYear, viewMonth])

  const setDatePart = (d: Date) => {
    const base = selected ?? (() => { const n = new Date(); n.setMinutes(0, 0, 0); return new Date(n.getTime() + 60 * 60 * 1000) })()
    const next = new Date(d)
    next.setHours(base.getHours(), base.getMinutes(), 0, 0)
    onChange(toValue(next))
  }

  const setTimePart = (h: number, m: number) => {
    const base = selected ?? new Date()
    const next = new Date(base)
    next.setHours(h, m, 0, 0)
    onChange(toValue(next))
  }

  const preset = (d: Date) => {
    onChange(toValue(d))
    setOpen(false)
  }

  const presets: { label: string; get: () => Date }[] = [
    { label: 'In 1 hour', get: () => new Date(Date.now() + 60 * 60 * 1000) },
    { label: 'Tonight 8 PM', get: () => { const d = new Date(); d.setHours(20, 0, 0, 0); if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); return d } },
    { label: 'Tomorrow 9 AM', get: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
  ]

  const monthNav = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const display = selected
    ? selected.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const isPast = (d: Date) => d < today
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border bg-background px-3 text-base transition-colors sm:text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open ? 'border-primary ring-2 ring-ring' : 'border-input hover:border-muted-foreground/40',
        )}
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        {display ? (
          <span className="truncate tabular-nums">{display}</span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="-mr-1 ml-auto shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Popover. Mobile: opens downward (reachable inside scrollable modal
          bodies) and never wider than the viewport. Desktop (sm+): opens
          upward as before. */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-full animate-scale-in rounded-2xl border border-border bg-card p-3 shadow-overlay sm:bottom-full sm:top-auto sm:mb-2 sm:mt-0 sm:w-[290px] sm:max-w-none">
          {/* Quick presets */}
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => preset(p.get())}
                className="rounded-lg border border-border px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground sm:py-1.5"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <button type="button" onClick={() => monthNav(-1)} aria-label="Previous month" className="rounded-lg p-2.5 hover:bg-muted sm:p-1.5">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => monthNav(1)} aria-label="Next month" className="rounded-lg p-2.5 hover:bg-muted sm:p-1.5">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-muted-foreground">
            {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {daysGrid.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  disabled={isPast(d)}
                  onClick={() => setDatePart(d)}
                  className={cn(
                    // ≥40px touch targets on mobile; compact on desktop.
                    'mx-auto flex h-10 w-full max-w-10 items-center justify-center rounded-full text-sm transition-colors sm:h-8 sm:w-8 sm:text-xs',
                    isPast(d) && 'text-muted-foreground/35',
                    !isPast(d) && 'hover:bg-muted',
                    selected && sameDay(d, selected) && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                    sameDay(d, new Date()) && !(selected && sameDay(d, selected)) && 'ring-1 ring-inset ring-primary/50',
                  )}
                >
                  {d.getDate()}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>

          {/* Time */}
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <select
              value={selected ? selected.getHours() : ''}
              onChange={(e) => setTimePart(Number(e.target.value), selected?.getMinutes() ?? 0)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:text-sm"
            >
              <option value="" disabled>HH</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            <span className="font-semibold text-muted-foreground">:</span>
            <select
              value={selected ? selected.getMinutes() : ''}
              onChange={(e) => setTimePart(selected?.getHours() ?? 9, Number(e.target.value))}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:text-sm"
            >
              <option value="" disabled>MM</option>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.97] sm:h-9"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
