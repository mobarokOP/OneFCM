import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Send, Plus, Trash2 } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { getErrorMessage } from '@/api/client'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, Pagination, type Column } from '@/components/ui/Table'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { NoAppSelected } from '@/components/NoAppSelected'
import { Composer, type ComposerInitial } from './notifications/Composer'
import { formatDateTime, formatNumber, formatPercent } from '@/lib/utils'
import type { NotificationItem } from '@/types'

export default function Notifications() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const [page, setPage] = useState(1)
  const [compose, setCompose] = useState(false)
  const [initial, setInitial] = useState<ComposerInitial | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  // Opened via "Duplicate" on a detail page: prefill the composer.
  useEffect(() => {
    const dup = (location.state as { duplicate?: ComposerInitial } | null)?.duplicate
    if (dup) {
      setInitial(dup)
      setCompose(true)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const query = useQuery({
    queryKey: ['notifications', appId, page],
    queryFn: () => notificationsApi.list(appId!, page),
    enabled: !!appId,
  })

  const remove = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(appId!, id),
    onSuccess: () => {
      toast.success('Notification deleted')
      qc.invalidateQueries({ queryKey: ['notifications', appId] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete')),
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Notifications" />
        <NoAppSelected />
      </>
    )
  }

  const columns: Column<NotificationItem>[] = [
    {
      key: 'title',
      header: 'Notification',
      render: (n) => (
        <div className="max-w-xs">
          <p className="truncate font-medium">{n.title || 'Untitled'}</p>
          <p className="truncate text-xs text-muted-foreground">{n.body}</p>
        </div>
      ),
    },
    {
      key: 'audience',
      header: 'Audience',
      render: (n) => (
        <Badge tone="muted" className="capitalize">
          {n.audience?.type ? String(n.audience.type).replace('_', ' ') : '—'}
        </Badge>
      ),
    },
    { key: 'status', header: 'Status', render: (n) => <StatusBadge status={n.status} /> },
    { key: 'sent', header: 'Sent', render: (n) => formatNumber(n.stats?.sent ?? n.estimated_recipients) },
    { key: 'ctr', header: 'CTR', render: (n) => formatPercent(n.stats?.ctr) },
    {
      key: 'created',
      header: 'Created',
      render: (n) => <span className="text-muted-foreground">{formatDateTime(n.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (n) => (
        <button
          type="button"
          title="Delete notification"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          disabled={remove.isPending}
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(`Delete "${n.title || 'Untitled'}"? Its delivery logs will be removed too.`)) {
              remove.mutate(n.id)
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Compose, schedule and review your push campaigns."
        actions={
          <Button onClick={() => { setInitial(null); setCompose(true) }} disabled={!appId}>
            <Plus className="h-4 w-4" /> New notification
          </Button>
        }
      />

      <Card>
        {query.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={query.data?.data ?? []}
              rowKey={(n) => n.id}
              onRowClick={(n) => navigate(`/notifications/${n.id}`)}
              empty={
                <EmptyState
                  icon={Send}
                  title="No notifications yet"
                  description="Create your first push notification to reach your audience."
                  action={
                    <Button onClick={() => { setInitial(null); setCompose(true) }}>
                      <Plus className="h-4 w-4" /> New notification
                    </Button>
                  }
                />
              }
            />
            {(query.data?.meta.total ?? 0) > 0 && (
              <Pagination
                page={page}
                perPage={query.data?.meta.per_page ?? 20}
                total={query.data?.meta.total ?? 0}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      {appId && (
        <Composer
          open={compose}
          onClose={() => { setCompose(false); setInitial(null) }}
          appId={appId}
          initial={initial}
        />
      )}
    </>
  )
}
