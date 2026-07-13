import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TimeseriesPoint } from '@/types'
import { CHART } from './ChartCard'

function tick(value: string) {
  try {
    return format(parseISO(value), 'MMM d')
  } catch {
    return value
  }
}

export function TimeseriesChart({ data, height = 280 }: { data: TimeseriesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {(['sent', 'delivered', 'opened'] as const).map((k) => (
            <linearGradient id={`grad-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART[k]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART[k]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={tick} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} minTickGap={32} />
        <YAxis tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            fontSize: 12,
            color: 'hsl(var(--foreground))',
          }}
          labelFormatter={(l) => tick(String(l))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="sent" stroke={CHART.sent} fill="url(#grad-sent)" strokeWidth={2} />
        <Area type="monotone" dataKey="delivered" stroke={CHART.delivered} fill="url(#grad-delivered)" strokeWidth={2} />
        <Area type="monotone" dataKey="opened" stroke={CHART.opened} fill="url(#grad-opened)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
