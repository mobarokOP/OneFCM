import type { ReactNode } from 'react'
import { Send, Smartphone, BarChart3 } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const features = [
  { icon: Send, text: 'Compose & schedule targeted campaigns' },
  { icon: Smartphone, text: 'Manage devices, users, tags & topics' },
  { icon: BarChart3, text: 'Real-time delivery & engagement analytics' },
]

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <img src="/brand/logo-mark.png" alt="OneFCM" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-semibold">OneFCM</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Android push notifications, done right.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            An open, self-hostable push platform built on Firebase Cloud Messaging.
          </p>
          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-primary-foreground/90">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} OneFCM</p>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-6 sm:pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-2.5">
                <img src="/brand/logo-mark.png" alt="OneFCM" className="h-12 w-12 rounded-xl" />
                <span className="text-lg font-semibold">OneFCM</span>
              </div>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
