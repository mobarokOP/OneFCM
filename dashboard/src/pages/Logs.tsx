import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info, ScrollText } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { logsApi } from '@/api/logs'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Table, Pagination, type Column } from '@/components/ui/Table'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { NoAppSelected } from '@/components/NoAppSelected'
import { formatDateTime } from '@/lib/utils'
import type { DeliveryLog } from '@/types'

export default function Logs() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const [notificationId, setNotificationId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const notifs = useQuery({
    queryKey: ['notifications', appId, 1],
    queryFn: () => notificationsApi.list(appId!, 1),
    enabled: !!appId,
  })

  useEffect(() => {
    if (!notificationId && notifs.data?.data.length) {
      setNotificationId(notifs.data.data[0].id)
    }
  }, [notifs.data, notificationId])

  const logs = useQuery({
    queryKey: ['logs', appId, notificationId, page, status],
    queryFn: () => logsApi.list(appId!, notificationId, { page, status: status || undefined }),
    enabled: !!appId && !!notificationId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Delivery Logs" />
        <NoAppSelected />
      </>
    )
  }

  const columns: Column<DeliveryLog>[] = [
    {
      key: 'device',
      header: 'Device',
      render: (l) => (
        <span className="inline-block max-w-[14rem] truncate align-bottom font-mono text-xs" title={l.device_id}>
          {l.device_id}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'fcm',
      header: 'FCM message ID',
      render: (l) => (
        <span
          className="inline-block max-w-[16rem] truncate align-bottom font-mono text-xs text-muted-foreground"
          title={l.fcm_message_id || undefined}
        >
          {l.fcm_message_id || '—'}
        </span>
      ),
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
      <PageHeader title="Delivery Logs" description="Per-device FCM delivery results and errors." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <Select
            value={notificationId}
            onChange={(e) => {
              setNotificationId(e.target.value)
              setPage(1)
            }}
            className="sm:max-w-md"
          >
            <option value="">Select a notification…</option>
            {notifs.data?.data.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || 'Untitled'} · {formatDateTime(n.created_at)}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="opened">Opened</option>
          </Select>
        </div>

        {!notificationId ? (
          <EmptyState icon={ScrollText} title="Select a notification" description="Choose a notification above to view its delivery logs." />
        ) : logs.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={logs.data?.data ?? []}
              rowKey={(l) => `${l.device_id}-${l.attempted_at}`}
              empty={<EmptyState icon={ScrollText} title="No logs found" description="No delivery attempts match this filter yet." />}
            />
            {(logs.data?.meta.total ?? 0) > 0 && (
              <Pagination page={page} perPage={logs.data?.meta.per_page ?? 20} total={logs.data?.meta.total ?? 0} onPageChange={setPage} />
            )}
            {(logs.data?.meta.total ?? 0) > 0 && !!logs.data?.meta.retention?.delivery_log_days && (
              <p className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Per-device delivery logs are retained for {logs.data.meta.retention.delivery_log_days} days;
                summary stats stay on the notification.
              </p>
            )}
          </>
        )}
      </Card>
    </>
  )
}
