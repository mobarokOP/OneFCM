import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Layers, Plus, Trash2, Pencil, Filter } from 'lucide-react'
import { segmentsApi, type SegmentPayload } from '@/api/segments'
import { getErrorMessage } from '@/api/client'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { NoAppSelected } from '@/components/NoAppSelected'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { formatNumber } from '@/lib/utils'
import type { Segment, SegmentFilter, SegmentOp } from '@/types'

const ops: { value: SegmentOp; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'exists', label: 'exists' },
]

const emptyFilter = (): SegmentFilter => ({ field: '', op: 'eq', value: '' })

export default function Segments() {
  const { appId, isLoading: appsLoading } = useCurrentApp()
  const qc = useQueryClient()
  const confirmDialog = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Segment | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<'dynamic' | 'static'>('dynamic')
  const [filters, setFilters] = useState<SegmentFilter[]>([emptyFilter()])

  const query = useQuery({
    queryKey: ['segments', appId],
    queryFn: () => segmentsApi.list(appId!),
    enabled: !!appId,
  })

  const openCreate = () => {
    setEditing(null)
    setName('')
    setType('dynamic')
    setFilters([emptyFilter()])
    setOpen(true)
  }

  const openEdit = (s: Segment) => {
    setEditing(s)
    setName(s.name)
    setType(s.type)
    setFilters(s.filters.length ? s.filters : [emptyFilter()])
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: SegmentPayload = {
        name,
        type,
        filters: filters.filter((f) => f.field.trim()),
      }
      return editing ? segmentsApi.update(appId!, editing.id, payload) : segmentsApi.create(appId!, payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Segment updated' : 'Segment created')
      qc.invalidateQueries({ queryKey: ['segments', appId] })
      setOpen(false)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not save segment')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => segmentsApi.remove(appId!, id),
    onSuccess: () => {
      toast.success('Segment deleted')
      qc.invalidateQueries({ queryKey: ['segments', appId] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete segment')),
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="Segments" />
        <NoAppSelected />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Segments"
        description="Group devices by tags and attributes for precise targeting."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New segment
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No segments yet"
            description="Build a segment with field/operator/value filters to target the right users."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Create segment
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data?.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold" title={s.name}>{s.name}</p>
                    <Badge tone={s.type === 'dynamic' ? 'primary' : 'muted'} className="mt-1 capitalize">
                      {s.type}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-semibold">{formatNumber(s.count)}</p>
                    <p className="text-xs text-muted-foreground">devices</p>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-1.5">
                  {s.filters.length === 0 && <p className="text-xs text-muted-foreground">No filters</p>}
                  {s.filters.map((f, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="break-all font-medium">{f.field}</span>
                      <span className="text-muted-foreground">{ops.find((o) => o.value === f.op)?.label ?? f.op}</span>
                      {f.op !== 'exists' && <span className="break-all rounded bg-muted px-1.5 py-0.5 font-mono">{f.value}</span>}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="h-10 flex-1 sm:h-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: `Delete segment "${s.name}"?`,
                        description: 'Notifications targeting this segment will no longer resolve it.',
                        confirmLabel: 'Delete',
                        tone: 'danger',
                        icon: 'trash',
                      })
                      if (ok) remove.mutate(s.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit segment' : 'New segment'}
        description="Devices matching all filters below are included."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()}>
              {editing ? 'Save segment' : 'Create segment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="seg-name">Segment name</Label>
              <Input id="seg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium users" />
            </div>
            <div>
              <Label htmlFor="seg-type">Type</Label>
              <Select id="seg-type" value={type} onChange={(e) => setType(e.target.value as 'dynamic' | 'static')}>
                <option value="dynamic">Dynamic (auto-updates)</option>
                <option value="static">Static (fixed set)</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Filters</Label>
              <button
                type="button"
                onClick={() => setFilters((f) => [...f, emptyFilter()])}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add filter
              </button>
            </div>
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
                  <Input
                    placeholder="field (e.g. country)"
                    className="min-w-0"
                    value={f.field}
                    onChange={(e) => setFilters((arr) => arr.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))}
                  />
                  <Select
                    className="w-32"
                    value={f.op}
                    onChange={(e) => setFilters((arr) => arr.map((x, j) => (j === i ? { ...x, op: e.target.value as SegmentOp } : x)))}
                  >
                    {ops.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="value"
                    className="min-w-0"
                    disabled={f.op === 'exists'}
                    value={f.value ?? ''}
                    onChange={(e) => setFilters((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end sm:justify-self-auto"
                    onClick={() => setFilters((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : arr))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
