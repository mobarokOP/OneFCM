import { useQuery } from '@tanstack/react-query'
import { Radio } from 'lucide-react'
import { topicsApi } from '@/api/topics'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { NoAppSelected } from '@/components/NoAppSelected'
import { formatNumber } from '@/lib/utils'

export default function Topics() {
  const { appId, isLoading: appsLoading } = useCurrentApp()

  const query = useQuery({
    queryKey: ['topics', appId],
    queryFn: () => topicsApi.list(appId!),
    enabled: !!appId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Topics" />
        <NoAppSelected />
      </>
    )
  }

  const topics = [...(query.data ?? [])].sort((a, b) => b.subscribers - a.subscribers)
  const max = Math.max(1, ...topics.map((t) => t.subscribers))

  return (
    <>
      <PageHeader title="Topics" description="Subscription channels devices can opt into via the SDK." />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <Card>
          <EmptyState
            icon={Radio}
            title="No topics yet"
            description="Topics are created automatically when devices subscribe through the SDK (OneFCM.subscribeTopic)."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((t) => (
            <Card key={t.name}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Radio className="h-4 w-4" />
                    </span>
                    <span className="truncate font-medium" title={t.name}>{t.name}</span>
                  </div>
                  <span className="shrink-0 text-lg font-semibold">{formatNumber(t.subscribers)}</span>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(t.subscribers / max) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">subscribers</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
