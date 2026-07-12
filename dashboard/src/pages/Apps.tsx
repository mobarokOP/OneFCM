import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppWindow, Plus, Settings, Smartphone, Users, Send } from 'lucide-react'
import { appsApi, type CreateAppPayload } from '@/api/apps'
import { getErrorMessage } from '@/api/client'
import { useApps } from '@/hooks/useApps'
import { useSelectedApp } from '@/store/app'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, FieldError, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'App name is required'),
  package_name: z.string().min(3, 'Package name is required'),
  fcm_service_account: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function Apps() {
  const { data: apps, isLoading } = useApps()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setSelectedAppId = useSelectedApp((s) => s.setSelectedAppId)

  useEffect(() => {
    if (params.get('new') === '1') {
      setOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      // Send the service account as a parsed object; the backend derives the
      // Firebase client config from it automatically.
      const payload: CreateAppPayload = { name: v.name, package_name: v.package_name }
      if (v.fcm_service_account?.trim()) {
        try {
          payload.fcm_service_account = JSON.parse(v.fcm_service_account)
        } catch {
          // Invalid JSON — let the backend's validation surface the error.
          payload.fcm_service_account = { _raw: v.fcm_service_account }
        }
      }
      return appsApi.create(payload)
    },
    onSuccess: (app) => {
      toast.success('Application created')
      qc.invalidateQueries({ queryKey: ['apps'] })
      if (app?.id) setSelectedAppId(app.id)
      setOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create application')),
  })

  return (
    <>
      <PageHeader
        title="Applications"
        description="Each application maps to one Android app and Firebase project."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New application
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-40" />
              <Skeleton className="mt-6 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : !apps || apps.length === 0 ? (
        <Card>
          <EmptyState
            icon={AppWindow}
            title="No applications yet"
            description="Create your first application to register devices and send push notifications."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Create application
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col transition-shadow hover:shadow-soft">
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
                      {app.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{app.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{app.package_name}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
                  <div>
                    <Smartphone className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-semibold">{formatNumber(app.stats?.devices)}</p>
                    <p className="text-[11px] text-muted-foreground">Devices</p>
                  </div>
                  <div>
                    <Users className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-semibold">{formatNumber(app.stats?.users)}</p>
                    <p className="text-[11px] text-muted-foreground">Users</p>
                  </div>
                  <div>
                    <Send className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-1 text-sm font-semibold">{formatNumber(app.stats?.sent_30d)}</p>
                    <p className="text-[11px] text-muted-foreground">Sent 30d</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAppId(app.id)
                      navigate('/')
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/apps/${app.id}/settings`)}
                  >
                    <Settings className="h-4 w-4" /> Settings
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
        title="Create application"
        description="Connect your Android app and Firebase project."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="create-app-form" type="submit" loading={mutation.isPending}>
              Create application
            </Button>
          </>
        }
      >
        <form id="create-app-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">App name</Label>
              <Input id="name" placeholder="Acme News" {...register('name')} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="package_name">Android package name</Label>
              <Input id="package_name" placeholder="com.acme.news" {...register('package_name')} />
              <FieldError>{errors.package_name?.message}</FieldError>
            </div>
          </div>
          <div>
            <Label htmlFor="fcm_service_account">Firebase service account JSON (optional)</Label>
            <Textarea
              id="fcm_service_account"
              rows={6}
              placeholder='{ "type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..." }'
              className="font-mono text-xs"
              {...register('fcm_service_account')}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Firebase Console → Project settings → Service accounts → Generate new private key.
              Everything else (project id, sender id, client keys) is derived automatically.
              You can also add this later in the app&apos;s settings.
            </p>
          </div>
        </form>
      </Modal>
    </>
  )
}
