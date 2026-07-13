import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { subDays, format } from 'date-fns'
import { Send, CheckCircle2, MousePointerClick, XCircle } from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { NoAppSelected } from '@/components/NoAppSelected'
import { ChartCard, CHART } from '@/components/charts/ChartCard'
import { TimeseriesChart } from '@/components/charts/Timeseries'
import { formatNumber, formatPercent } from '@/lib/utils'

const ranges = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export default function Analytics() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const [range, setRange] = useState('30')

  const to = new Date()
  const from = subDays(to, Number(range))
  const fromStr = format(from, 'yyyy-MM-dd')
  const toStr = format(to, 'yyyy-MM-dd')

  const query = useQuery({
    queryKey: ['analytics', appId, fromStr, toStr],
    queryFn: () => analyticsApi.range(appId!, fromStr, toStr),
    enabled: !!appId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Analytics" />
        <NoAppSelected />
      </>
    )
  }

  const a = query.data
  const funnel = [
    { stage: 'Sent', value: a?.sent ?? 0, color: CHART.sent },
    { stage: 'Delivered', value: a?.delivered ?? 0, color: CHART.delivered },
    { stage: 'Opened', value: a?.opened ?? 0, color: CHART.opened },
  ]
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 12,
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Delivery and engagement performance."
        actions={
          <Select value={range} onChange={(e) => setRange(e.target.value)} options={ranges} className="w-full sm:w-44" />
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {query.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Sent" value={formatNumber(a?.sent)} icon={Send} />
            <StatCard label="Delivered" value={formatNumber(a?.delivered)} icon={CheckCircle2} />
            <StatCard label="Opened" value={formatNumber(a?.opened)} icon={MousePointerClick} />
            <StatCard label="Failed" value={formatNumber(a?.failed)} icon={XCircle} />
          </>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <ChartCard title="Delivery over time" description="Daily sent, delivered and opened">
          {query.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (a?.timeseries?.length ?? 0) === 0 ? (
            <EmptyState icon={Send} title="No data in this range" />
          ) : (
            <TimeseriesChart data={a!.timeseries} />
          )}
        </ChartCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Conversion funnel" description="Sent → Delivered → Opened">
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {funnel.map((f, i) => (
                        <Cell key={i} fill={f.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-around text-center text-xs">
                  <div>
                    <p className="font-semibold">{formatPercent(a && a.sent ? a.delivered / a.sent : 0)}</p>
                    <p className="text-muted-foreground">delivery rate</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatPercent(a?.ctr)}</p>
                    <p className="text-muted-foreground">open/CTR</p>
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard title="By country" description="Top recipient countries">
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (a?.by_country?.length ?? 0) === 0 ? (
              <EmptyState icon={Send} title="No country data" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={a!.by_country.slice(0, 8)} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="value" fill={CHART.sent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="By Android version" description="Device OS distribution">
            {query.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (a?.by_os?.length ?? 0) === 0 ? (
              <EmptyState icon={Send} title="No OS data" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={a!.by_os.slice(0, 6)}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {a!.by_os.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHART.categorical[i % CHART.categorical.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {!query.isLoading && a && (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-5 text-center sm:grid-cols-4">
              <Metric label="Delivery rate" value={formatPercent(a.sent ? a.delivered / a.sent : 0)} />
              <Metric label="Open rate" value={formatPercent(a.delivered ? a.opened / a.delivered : 0)} />
              <Metric label="Failure rate" value={formatPercent(a.sent ? a.failed / a.sent : 0)} />
              <Metric label="CTR" value={formatPercent(a.ctr)} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
