import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Ban, Copy, Send, CheckCircle2, XCircle, MousePointerClick, Image as ImageIcon } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { logsApi } from '@/api/logs'
import { getErrorMessage } from '@/api/client'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { Table, Pagination, type Column } from '@/components/ui/Table'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { formatDateTime, formatNumber, formatPercent } from '@/lib/utils'
import type { DeliveryLog } from '@/types'

export default function NotificationDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { appId } = useCurrentApp()
  const [logPage, setLogPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const notif = useQuery({
    queryKey: ['notification', appId, id],
    queryFn: () => notificationsApi.get(appId!, id),
    enabled: !!appId && !!id,
  })

  const logs = useQuery({
    queryKey: ['logs', appId, id, logPage, statusFilter],
    queryFn: () => logsApi.list(appId!, id, { page: logPage, status: statusFilter || undefined }),
    enabled: !!appId && !!id,
  })

  const cancel = useMutation({
    mutationFn: () => notificationsApi.cancel(appId!, id),
    onSuccess: () => {
      toast.success('Notification canceled')
      qc.invalidateQueries({ queryKey: ['notification', id] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not cancel')),
  })

  const n = notif.data
  const stats = n?.stats
  const cancelable = n && ['queued', 'scheduled'].includes(n.status)

  const logColumns: Column<DeliveryLog>[] = [
    { key: 'device', header: 'Device', render: (l) => <span className="font-mono text-xs">{l.device_id}</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'fcm',
      header: 'FCM message ID',
      render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.fcm_message_id || '—'}</span>,
    },
    {
      key: 'error',
      header: 'Error',
      render: (l) => (l.error ? <Badge tone="danger">{l.error}</Badge> : <span className="text-muted-foreground">—</span>),
    },
    { key: 'retry', header: 'Retries', render: (l) => l.retry_count },
    {
      key: 'attempted',
      header: 'Attempted',
      render: (l) => <span className="text-muted-foreground">{formatDateTime(l.attempted_at)}</span>,
    },
  ]

  return (
    <>
      <button
        onClick={() => navigate('/notifications')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to notifications
      </button>

      {notif.isLoading ? (
        <Skeleton className="h-9 w-64" />
      ) : (
        <PageHeader
          title={n?.title || 'Notification'}
          description={n ? `Created ${formatDateTime(n.created_at)}` : undefined}
          actions={
            <div className="flex items-center gap-2">
              {n && <StatusBadge status={n.status} />}
              {n && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate('/notifications', {
                      state: {
                        duplicate: {
                          title: n.title,
                          body: n.body,
                          image_url: n.image_url,
                          deep_link: n.deep_link,
                          priority: n.priority,
                          data: n.data,
                        },
                      },
                    })
                  }
                >
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
              )}
              {cancelable && (
                <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Sent" value={formatNumber(stats?.sent)} icon={Send} />
        <StatCard label="Delivered" value={formatNumber(stats?.delivered)} icon={CheckCircle2} />
        <StatCard label="Opened" value={formatNumber(stats?.opened)} icon={MousePointerClick} />
        <StatCard label="Failed" value={formatNumber(stats?.failed)} icon={XCircle} />
        <StatCard label="CTR" value={formatPercent(stats?.ctr)} icon={MousePointerClick} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {n?.image_url && <NotificationImage url={n.image_url} />}
            <Detail label="Title" value={n?.title} />
            <Detail label="Body" value={n?.body} />
            <Detail label="Deep link" value={n?.deep_link || '—'} mono />
            <Detail label="Priority" value={n?.priority} />
            <Detail label="TTL" value={n?.ttl ? `${n.ttl}s` : '—'} />
            <Detail label="Channel" value={n?.channel_id || '—'} />
            <Detail
              label="Audience"
              value={n?.audience?.type ? String(n.audience.type).replace('_', ' ') : '—'}
            />
            {n?.data && Object.keys(n.data).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom data</p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-xs">{JSON.stringify(n.data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Delivery logs</CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setLogPage(1)
              }}
              className="h-9 w-40"
            >
              <option value="">All statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="opened">Opened</option>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {logs.isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <>
                <Table
                  columns={logColumns}
                  rows={logs.data?.data ?? []}
                  rowKey={(l) => `${l.device_id}-${l.attempted_at}`}
                  empty={<EmptyState icon={Send} title="No delivery logs" description="Logs appear once dispatch begins." />}
                />
                {(logs.data?.meta.total ?? 0) > (logs.data?.meta.per_page ?? 20) && (
                  <Pagination
                    page={logPage}
                    perPage={logs.data?.meta.per_page ?? 20}
                    total={logs.data?.meta.total ?? 0}
                    onPageChange={setLogPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Detail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? 'break-all font-mono text-xs' : 'text-sm'}>{value || '—'}</p>
    </div>
  )
}

/** Renders the pushed image from any URL, falling back gracefully if it can't load. */
function NotificationImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-muted text-muted-foreground">
        <ImageIcon className="h-6 w-6" />
        <a href={url} target="_blank" rel="noreferrer" className="max-w-full truncate px-3 text-xs underline">
          {url}
        </a>
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt="Notification image"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-48 w-full rounded-xl border border-border object-cover"
      />
    </a>
  )
}
