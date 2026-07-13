import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Smartphone, Users, Send, MousePointerClick, ArrowRight, Inbox } from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import { notificationsApi } from '@/api/notifications'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { NoAppSelected } from '@/components/NoAppSelected'
import { ChartCard } from '@/components/charts/ChartCard'
import { TimeseriesChart } from '@/components/charts/Timeseries'
import { formatNumber, formatPercent, fromNow } from '@/lib/utils'

export default function Overview() {
  const { appId, app, isLoading: appsLoading } = useCurrentApp()

  const overview = useQuery({
    queryKey: ['analytics', 'overview', appId],
    queryFn: () => analyticsApi.overview(appId!),
    enabled: !!appId,
  })

  const recent = useQuery({
    queryKey: ['notifications', appId, 'recent'],
    queryFn: () => notificationsApi.list(appId!, 1),
    enabled: !!appId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Overview" />
        <NoAppSelected />
      </>
    )
  }

  const o = overview.data
  const devices = o?.devices ?? app?.stats?.devices ?? 0
  const users = o?.users ?? app?.stats?.users ?? 0
  const sent = o?.sent_30d ?? app?.stats?.sent_30d ?? 0
  const ctr = o?.ctr ?? 0
  const series = o?.timeseries ?? []
  const recentItems = (o?.recent_notifications ?? recent.data?.data ?? []).slice(0, 6)

  return (
    <>
      <PageHeader
        title="Overview"
        description={app ? `Performance for ${app.name}` : 'Your push activity at a glance'}
        actions={
          <Link to="/notifications">
            <Button>
              <Send className="h-4 w-4" /> New notification
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {overview.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total devices" value={formatNumber(devices)} icon={Smartphone} hint="registered" />
            <StatCard label="Users" value={formatNumber(users)} icon={Users} hint="identified" />
            <StatCard label="Sent (30d)" value={formatNumber(sent)} icon={Send} hint="last 30 days" />
            <StatCard label="Click-through" value={formatPercent(ctr)} icon={MousePointerClick} hint="avg CTR" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Delivery trend" description="Sent, delivered and opened over time">
            {overview.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : series.length === 0 ? (
              <EmptyState icon={Send} title="No activity yet" description="Send your first notification to see trends here." />
            ) : (
              <TimeseriesChart data={series} />
            )}
          </ChartCard>
        </div>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent notifications</CardTitle>
            <Link to="/notifications" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <div className="flex-1 px-2 pb-2">
            {recent.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing sent yet" />
            ) : (
              <ul className="space-y-1">
                {recentItems.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/notifications/${n.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title || 'Untitled'}</p>
                        <p className="truncate text-xs text-muted-foreground">{fromNow(n.created_at)}</p>
                      </div>
                      <StatusBadge status={n.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
