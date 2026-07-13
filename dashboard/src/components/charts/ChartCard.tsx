import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}

export function ChartCard({ title, description, children, actions }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// Shared chart palette (indigo/violet accent family + neutrals).
export const CHART = {
  sent: '#6366f1',
  delivered: '#22c55e',
  opened: '#f59e0b',
  failed: '#ef4444',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  categorical: ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'],
}
