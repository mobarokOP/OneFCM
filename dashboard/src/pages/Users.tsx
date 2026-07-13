import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users as UsersIcon } from 'lucide-react'
import { usersApi } from '@/api/users'
import { useCurrentApp } from '@/hooks/useApps'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, Pagination, type Column } from '@/components/ui/Table'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { NoAppSelected } from '@/components/NoAppSelected'
import { formatDateTime, formatNumber, fromNow, initials } from '@/lib/utils'
import type { AppUser } from '@/types'

export default function UsersPage() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)

  const query = useQuery({
    queryKey: ['users', appId, page, debounced],
    queryFn: () => usersApi.list(appId!, { page, search: debounced || undefined }),
    enabled: !!appId,
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Users" />
        <NoAppSelected />
      </>
    )
  }

  const columns: Column<AppUser>[] = [
    {
      key: 'external',
      header: 'External ID',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-accent-foreground">
            {initials(u.external_id ?? 'U')}
          </span>
          <span className="block max-w-[14rem] truncate font-medium" title={u.external_id ?? undefined}>
            {u.external_id || <span className="text-muted-foreground">anonymous</span>}
          </span>
        </div>
      ),
    },
    { key: 'devices', header: 'Devices', render: (u) => <Badge tone="muted">{formatNumber(u.devices ?? 0)}</Badge> },
    { key: 'country', header: 'Country', render: (u) => u.country || '—' },
    { key: 'language', header: 'Language', render: (u) => u.language || '—' },
    { key: 'active', header: 'Last active', render: (u) => <span className="text-muted-foreground">{fromNow(u.last_active_at)}</span> },
    { key: 'created', header: 'Joined', render: (u) => <span className="text-muted-foreground">{formatDateTime(u.created_at)}</span> },
  ]

  return (
    <>
      <PageHeader title="Users" description="Identified end-users across their devices." />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by external ID…" className="sm:max-w-sm" />
        </div>
        {query.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <Table
              columns={columns}
              rows={query.data?.data ?? []}
              rowKey={(u) => u.id}
              empty={<EmptyState icon={UsersIcon} title="No users found" description="Users appear after they log in through the SDK." />}
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
