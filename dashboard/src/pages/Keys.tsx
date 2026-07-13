import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Plus, Trash2, Copy, Check, ShieldAlert } from 'lucide-react'
import { keysApi } from '@/api/keys'
import { getErrorMessage } from '@/api/client'
import { useCurrentApp } from '@/hooks/useApps'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { Table, type Column } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { NoAppSelected } from '@/components/NoAppSelected'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { copyToClipboard, formatDate, fromNow } from '@/lib/utils'
import type { ApiKey } from '@/types'

export default function Keys() {
  const { appId, app, isLoading: appsLoading } = useCurrentApp()
  const qc = useQueryClient()
  const confirmDialog = useConfirm()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const query = useQuery({
    queryKey: ['keys', appId],
    queryFn: () => keysApi.list(appId!),
    enabled: !!appId,
  })

  const create = useMutation({
    mutationFn: () => keysApi.create(appId!, name),
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['keys', appId] })
      setCreateOpen(false)
      setName('')
      setNewKey(key)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create key')),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => keysApi.revoke(appId!, id),
    onSuccess: () => {
      toast.success('API key revoked')
      qc.invalidateQueries({ queryKey: ['keys', appId] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not revoke key')),
  })

  if (!appsLoading && !appId) {
    return (
      <>
        <PageHeader title="API Keys" />
        <NoAppSelected />
      </>
    )
  }

  const columns: Column<ApiKey>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (k) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="font-medium">{k.name}</span>
        </div>
      ),
    },
    { key: 'prefix', header: 'Key', render: (k) => <span className="font-mono text-xs">{k.prefix}••••••••</span> },
    { key: 'used', header: 'Last used', render: (k) => <span className="text-muted-foreground">{k.last_used_at ? fromNow(k.last_used_at) : 'Never'}</span> },
    { key: 'created', header: 'Created', render: (k) => <span className="text-muted-foreground">{formatDate(k.created_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (k) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 sm:h-8"
          onClick={async () => {
            const ok = await confirmDialog({
              title: `Revoke "${k.name}"?`,
              description: 'Applications using this API key will stop working immediately.',
              confirmLabel: 'Revoke',
              tone: 'danger',
              icon: 'shield',
            })
            if (ok) revoke.mutate(k.id)
          }}
        >
          <Trash2 className="h-4 w-4" /> Revoke
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="API Keys"
        description={app ? `Server-to-server REST keys for ${app.name}.` : 'Server-to-server REST keys.'}
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!appId}>
            <Plus className="h-4 w-4" /> Create key
          </Button>
        }
      />

      <Card>
        {query.isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : (
          <Table
            columns={columns}
            rows={query.data ?? []}
            rowKey={(k) => k.id}
            empty={
              <EmptyState
                icon={KeyRound}
                title="No API keys"
                description="Create a REST API key to send notifications from your servers."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Create key
                  </Button>
                }
              />
            }
          />
        )}
      </Card>

      {/* Create */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create API key"
        description="Give this key a recognizable name."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name.trim()}>
              Create key
            </Button>
          </>
        }
      >
        <Label htmlFor="key-name">Key name</Label>
        <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production server" autoFocus />
      </Modal>

      {/* Show once */}
      <Modal
        open={!!newKey}
        onClose={() => {
          setNewKey(null)
          setCopied(false)
        }}
        title="Copy your API key"
        description="This is the only time the full key will be shown."
        footer={
          <Button
            onClick={() => {
              setNewKey(null)
              setCopied(false)
            }}
          >
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Store this secret securely. You won&apos;t be able to see it again after closing this dialog.</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={newKey?.key ?? ''} className="min-w-0 font-mono sm:text-xs" />
            <Button
              variant="outline"
              onClick={async () => {
                if (newKey?.key) {
                  await copyToClipboard(newKey.key)
                  setCopied(true)
                  toast.success('Key copied to clipboard')
                }
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use it as <span className="font-mono">Authorization: Bearer &lt;key&gt;</span> when calling the REST API.
          </p>
          {newKey?.name && <Badge tone="muted">{newKey.name}</Badge>}
        </div>
      </Modal>
    </>
  )
}
