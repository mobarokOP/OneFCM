import { useEffect, useState } from 'react'
import { Bell, Wifi, Signal, BatteryMedium, Lock, ChevronDown, Camera, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DevicePreviewProps {
  title: string
  body: string
  imageUrl?: string
  appName?: string
}

/**
 * Realistic Android device mockup previewing the notification exactly where
 * users will meet it: on the lock screen and in the notification shade.
 */
export function DevicePreview({ title, body, imageUrl, appName = 'Your App' }: DevicePreviewProps) {
  const [mode, setMode] = useState<'lock' | 'shade'>('lock')
  const [imgOk, setImgOk] = useState(true)
  const [now, setNow] = useState(() => new Date())

  // Live clock — the mockup should feel alive.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Re-try the image whenever the URL changes.
  useEffect(() => {
    setImgOk(true)
  }, [imageUrl])

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  const shownTitle = title || 'Notification title'
  const shownBody = body || 'Your message preview appears here.'
  const hasImage = Boolean(imageUrl) && imgOk

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { key: 'lock', label: 'Lock screen' },
            { key: 'shade', label: 'Notification panel' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              mode === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Device frame */}
      <div className="mx-auto w-[270px]">
        <div className="relative rounded-[2.4rem] border-[6px] border-zinc-900 bg-zinc-900 shadow-2xl dark:border-zinc-700/80">
          {/* Screen */}
          <div
            className="relative h-[540px] overflow-hidden rounded-[2rem] text-white"
            style={{
              background:
                'radial-gradient(120% 90% at 20% 0%, #2b2a55 0%, #171732 45%, #0b0b1a 100%)',
            }}
          >
            {/* Punch-hole camera */}
            <div className="absolute left-1/2 top-2.5 z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black ring-1 ring-zinc-800" />

            {/* Status bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-2 text-[10px] font-medium text-white/85">
              <span>{time}</span>
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                <Signal className="h-3 w-3" />
                <BatteryMedium className="h-3.5 w-3.5" />
              </span>
            </div>

            {mode === 'lock' ? (
              <>
                {/* Lock screen clock */}
                <div className="mt-12 text-center">
                  <div className="text-[54px] font-semibold leading-none tracking-tight tabular-nums">
                    {time}
                  </div>
                  <div className="mt-1.5 text-xs text-white/70">{date}</div>
                </div>

                {/* Lock-screen notification (compact, thumbnail on the right) */}
                <div className="mx-3 mt-8 rounded-2xl bg-white/95 p-3 text-zinc-900 shadow-lg backdrop-blur dark:bg-zinc-100/95">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                      <Bell className="h-2 w-2" />
                    </span>
                    <span className="font-medium">{appName}</span>
                    <span>· now</span>
                  </div>
                  <div className="mt-1 flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-semibold leading-snug">{shownTitle}</p>
                      <p className="line-clamp-2 text-xs leading-snug text-zinc-600">{shownBody}</p>
                    </div>
                    {hasImage && (
                      <img
                        src={imageUrl}
                        alt=""
                        onError={() => setImgOk(false)}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Lock hint + bottom shortcuts */}
                <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-4">
                  <div className="flex w-full items-end justify-between px-7">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      <Phone className="h-4 w-4 text-white/80" />
                    </span>
                    <Lock className="mb-1 h-3.5 w-3.5 text-white/60" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      <Camera className="h-4 w-4 text-white/80" />
                    </span>
                  </div>
                  <div className="h-1 w-24 rounded-full bg-white/40" />
                </div>
              </>
            ) : (
              <>
                {/* Shade: dimmed wallpaper + date row */}
                <div className="relative z-10 px-4">
                  <div className="mt-3 flex items-center justify-between text-white/80">
                    <span className="text-xs">{date}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>

                  {/* Quick-settings pills */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {['Wi-Fi', 'BT', 'DND', 'Torch'].map((q, i) => (
                      <div
                        key={q}
                        className={cn(
                          'rounded-full py-1.5 text-center text-[9px] font-medium',
                          i === 0 ? 'bg-indigo-500/90 text-white' : 'bg-white/12 text-white/70',
                        )}
                      >
                        {q}
                      </div>
                    ))}
                  </div>

                  {/* Expanded notification (BigPictureStyle) */}
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white/95 text-zinc-900 shadow-xl backdrop-blur dark:bg-zinc-100/95">
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                          <Bell className="h-2 w-2" />
                        </span>
                        <span className="font-medium">{appName}</span>
                        <span>· now</span>
                        <ChevronDown className="ml-auto h-3 w-3" />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold leading-snug">{shownTitle}</p>
                      <p className="mt-0.5 line-clamp-3 text-xs leading-snug text-zinc-600">{shownBody}</p>
                    </div>
                    {hasImage && (
                      <img
                        src={imageUrl}
                        alt=""
                        onError={() => setImgOk(false)}
                        className="max-h-36 w-full object-cover"
                      />
                    )}
                    <div className="flex gap-4 px-3 py-2 text-[11px] font-semibold text-indigo-600">
                      <span>Open</span>
                      <span className="text-zinc-400">Dismiss</span>
                    </div>
                  </div>

                  {/* A muted second notification for realism */}
                  <div className="mt-2 rounded-2xl bg-white/25 p-2.5 backdrop-blur-sm">
                    <div className="h-2 w-24 rounded bg-white/40" />
                    <div className="mt-1.5 h-2 w-36 rounded bg-white/25" />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-2 flex justify-center">
                  <div className="h-1 w-24 rounded-full bg-white/40" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {imageUrl && !imgOk && (
        <p className="mt-2 text-center text-[11px] text-amber-500">
          Image URL could not be loaded — check it points directly to an image.
        </p>
      )}
    </div>
  )
}
