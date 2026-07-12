import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Copy, Flame } from 'lucide-react'
import { appsApi } from '@/api/apps'
import { getErrorMessage } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { ServiceAccountInput, parseServiceAccount } from '@/components/ServiceAccountInput'
import { copyToClipboard, formatDate, formatDateTime } from '@/lib/utils'
import type { Application } from '@/types'

interface SettingsForm {
  name: string
  package_name: string
  status: string
  rate_limit: number
}

function FcmStatusCard({ app }: { app: Application }) {
  const fcm = app.fcm
  const configured = !!(fcm && (fcm.project_id || fcm.error)) || !!app.has_service_account

  let badge = <Badge tone="muted">Not configured</Badge>
  if (fcm?.error) badge = <Badge tone="danger">Error</Badge>
  else if (fcm?.synced) badge = <Badge tone="success">Connected</Badge>
  else if (configured) badge = <Badge tone="warning">Pending sync</Badge>

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-muted-foreground" />
          Firebase connection
        </div>
        {badge}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <dt className="text-xs text-muted-foreground">Connected project</dt>
          <dd className="font-mono text-xs">{fcm?.project_id ?? '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <dt className="text-xs text-muted-foreground">Sender ID</dt>
          <dd className="font-mono text-xs">{fcm?.sender_id ?? '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <dt className="text-xs text-muted-foreground">Package name</dt>
          <dd className="font-mono text-xs">{fcm?.package_name ?? '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <dt className="text-xs text-muted-foreground">Last synced</dt>
          <dd className="text-xs">{fcm?.synced_at ? formatDateTime(fcm.synced_at) : '—'}</dd>
        </div>
      </dl>

      {fcm?.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {fcm.error}
        </p>
      )}
    </div>
  )
}

export default function AppSettings() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [saRaw, setSaRaw] = useState('')

  const { data: app, isLoading } = useQuery({
    queryKey: ['apps', id],
    queryFn: () => appsApi.get(id),
    enabled: !!id,
  })

  const { register, handleSubmit, reset } = useForm<SettingsForm>()

  useEffect(() => {
    if (app) {
      reset({
        name: app.name,
        package_name: app.package_name,
        status: app.status,
        rate_limit: app.rate_limit ?? 0,
      })
    }
  }, [app, reset])

  const saParsed = parseServiceAccount(saRaw)
  const saBlocking = saRaw.trim().length > 0 && !saParsed.ok

  const update = useMutation({
    mutationFn: (v: SettingsForm) =>
      appsApi.update(id, {
        name: v.name,
        package_name: v.package_name,
        status: v.status,
        rate_limit: Number(v.rate_limit) || 0,
        ...(saParsed.ok && saParsed.data ? { fcm_service_account: saParsed.data } : {}),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['apps', id], updated)
      qc.invalidateQueries({ queryKey: ['apps'] })
      setSaRaw('')
      if (updated.fcm?.error) {
        toast.error(`Settings saved, but Firebase sync failed: ${updated.fcm.error}`)
      } else if (saParsed.ok && updated.fcm?.synced) {
        toast.success(`Connected to Firebase project ${updated.fcm.project_id}`)
      } else {
        toast.success('Settings saved')
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not save settings')),
  })

  const remove = useMutation({
    mutationFn: () => appsApi.remove(id),
    onSuccess: () => {
      toast.success('Application deleted')
      qc.invalidateQueries({ queryKey: ['apps'] })
      navigate('/apps')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete application')),
  })

  return (
    <>
      <button
        onClick={() => navigate('/apps')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </button>

      <PageHeader
        title={app?.name ?? 'Application settings'}
        description={app?.package_name}
        actions={app && <StatusBadge status={app.status} />}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !app ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Application not found.</CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic application identity.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">App name</Label>
                <Input id="name" {...register('name')} />
              </div>
              <div>
                <Label htmlFor="package_name">Package name</Label>
                <Input id="package_name" {...register('package_name')} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="disabled">Disabled</option>
                </Select>
              </div>
              <div>
                <Label>Application ID (App ID)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={app.id} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await copyToClipboard(app.id)
                      toast.success('App ID copied')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firebase Cloud Messaging</CardTitle>
              <CardDescription>
                Upload your Firebase service account key — project ID, sender ID and client config are derived
                automatically. Your Android app needs zero Firebase setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FcmStatusCard app={app} />
              <div>
                <Label htmlFor="fcm_service_account">
                  {app.has_service_account ? 'Replace service account key' : 'Service account key'}
                </Label>
                <ServiceAccountInput value={saRaw} onChange={setSaRaw} disabled={update.isPending} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate limits</CardTitle>
              <CardDescription>Maximum notifications dispatched per minute for this app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="rate_limit">Messages / minute</Label>
                <Input id="rate_limit" type="number" min={0} {...register('rate_limit')} />
                <p className="mt-1 text-xs text-muted-foreground">Set 0 for unlimited (subject to FCM quotas).</p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <p className="text-xs text-muted-foreground">Created {formatDate(app.created_at)}</p>
              <div className="flex items-center gap-3">
                {saBlocking && (
                  <p className="text-xs text-red-600 dark:text-red-400">Fix the service-account JSON to save.</p>
                )}
                <Button type="submit" loading={update.isPending} disabled={saBlocking}>
                  Save changes
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger zone</CardTitle>
              <CardDescription>Deleting an application removes all its devices, users and logs.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                type="button"
                variant="danger"
                loading={remove.isPending}
                onClick={() => {
                  if (confirm(`Delete "${app.name}"? This cannot be undone.`)) remove.mutate()
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete application
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </>
  )
}
