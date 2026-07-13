import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Smartphone, ShieldCheck, ShieldX } from 'lucide-react'
import { devicesApi } from '@/api/devices'
import { segmentsApi } from '@/api/segments'
import { useCurrentApp } from '@/hooks/useApps'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, Pagination, type Column } from '@/components/ui/Table'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { NoAppSelected } from '@/components/NoAppSelected'
import { formatDateTime, fromNow } from '@/lib/utils'
import type { Device } from '@/types'

function permission(value: Device['notification_permission']) {
  const granted = value === true || value === 'granted' || value === 'authorized'
  return granted ? (
    <Badge tone="success">
      <ShieldCheck className="h-3.5 w-3.5" /> Granted
    </Badge>
  ) : (
    <Badge tone="muted">
      <ShieldX className="h-3.5 w-3.5" /> Denied
    </Badge>
  )
}

export default function Devices() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const debounced = useDebounce(search)

  const segments = useQuery({
    queryKey: ['segments', appId],
    queryFn: () => segmentsApi.list(appId!),
    enabled: !!appId,
  })

  const query = useQuery({
    queryKey: ['devices', appId, page, debounced, segment],
    queryFn: () => devicesApi.list(appId!, { page, search: debounced || undefined, segment: segment || undefined }),
    enabled: !!appId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Devices" />
        <NoAppSelected />
      </>
    )
  }

  const columns: Column<Device>[] = [
    {
      key: 'device',
      header: 'Device',
      render: (d) => (
        <div className="min-w-0">
          <p className="max-w-[15rem] truncate font-mono text-xs" title={d.id}>{d.id}</p>
          {d.external_id && (
            <p className="max-w-[15rem] truncate text-xs text-muted-foreground" title={d.external_id}>
              user: {d.external_id}
            </p>
          )}
        </div>
      ),
    },
    { key: 'os', header: 'Android', render: (d) => d.os_version || '—' },
    { key: 'app', header: 'App ver.', render: (d) => d.app_version || '—' },
    {
      key: 'locale',
      header: 'Locale',
      render: (d) => (
        <span>
          {d.country || '—'}
          {d.language ? ` · ${d.language}` : ''}
        </span>
      ),
    },
    { key: 'perm', header: 'Permission', render: (d) => permission(d.notification_permission) },
    { key: 'active', header: 'Last active', render: (d) => <span className="text-muted-foreground">{fromNow(d.last_active_at)}</span> },
    { key: 'created', header: 'Registered', render: (d) => <span className="text-muted-foreground">{formatDateTime(d.created_at)}</span> },
  ]

  return (
    <>
      <PageHeader title="Devices" description="All Android devices registered through the SDK." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search device / external ID…" className="sm:max-w-sm" />
          <Select
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value)
              setPage(1)
            }}
            className="sm:w-56"
          >
            <option value="">All segments</option>
            {segments.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        {query.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={query.data?.data ?? []}
              rowKey={(d) => d.id}
              empty={<EmptyState icon={Smartphone} title="No devices found" description="Devices appear after the SDK registers them." />}
            />
            {(query.data?.meta.total ?? 0) > 0 && (
              <Pagination page={page} perPage={query.data?.meta.per_page ?? 20} total={query.data?.meta.total ?? 0} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>
    </>
  )
}
