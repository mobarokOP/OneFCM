import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2, Users2 } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { segmentsApi } from '@/api/segments'
import { topicsApi } from '@/api/topics'
import { getErrorMessage } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { cn, formatNumber } from '@/lib/utils'
import { DevicePreview } from './DevicePreview'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import type { AudienceType, CreateNotificationPayload } from '@/types'

/** Prefill values, e.g. when duplicating an existing notification. */
export interface ComposerInitial {
  title?: string | null
  body?: string | null
  image_url?: string | null
  deep_link?: string | null
  priority?: 'high' | 'normal' | string | null
  data?: Record<string, unknown> | null
}

interface ComposerProps {
  open: boolean
  onClose: () => void
  appId: string
  initial?: ComposerInitial | null
}

interface KV {
  key: string
  value: string
}

const audienceOptions: { value: AudienceType; label: string; hint: string }[] = [
  { value: 'all', label: 'All devices', hint: 'Everyone subscribed' },
  { value: 'user_ids', label: 'User IDs', hint: 'Comma-separated external IDs' },
  { value: 'device_ids', label: 'Device IDs', hint: 'Comma-separated device IDs' },
  { value: 'tags', label: 'Tags', hint: 'key=value pairs' },
  { value: 'segment', label: 'Segment', hint: 'A saved segment' },
  { value: 'topic', label: 'Topic', hint: 'A subscription topic' },
]

export function Composer({ open, onClose, appId, initial }: ComposerProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal'>('high')
  const [ttl, setTtl] = useState(2419200)
  const [channelId, setChannelId] = useState('')
  const [collapseKey, setCollapseKey] = useState('')
  const [data, setData] = useState<KV[]>([])

  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [audienceText, setAudienceText] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [topic, setTopic] = useState('')

  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [sendAt, setSendAt] = useState('')

  // Prefill when duplicating an existing notification.
  useEffect(() => {
    if (!open || !initial) return
    setTitle(initial.title ?? '')
    setBody(initial.body ?? '')
    setImageUrl(initial.image_url ?? '')
    setDeepLink(initial.deep_link ?? '')
    setPriority(initial.priority === 'normal' ? 'normal' : 'high')
    setData(
      Object.entries(initial.data ?? {}).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
    )
  }, [open, initial])

  const segments = useQuery({
    queryKey: ['segments', appId],
    queryFn: () => segmentsApi.list(appId),
    enabled: open,
  })
  const topics = useQuery({
    queryKey: ['topics', appId],
    queryFn: () => topicsApi.list(appId),
    enabled: open,
  })

  const reset = () => {
    setTitle('')
    setBody('')
    setImageUrl('')
    setDeepLink('')
    setPriority('high')
    setTtl(2419200)
    setChannelId('')
    setCollapseKey('')
    setData([])
    setAudienceType('all')
    setAudienceText('')
    setSegmentId('')
    setTopic('')
    setScheduleMode('now')
    setSendAt('')
  }

  function buildAudienceValue(): unknown {
    switch (audienceType) {
      case 'user_ids':
      case 'device_ids':
        return audienceText
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      case 'tags': {
        const obj: Record<string, string> = {}
        audienceText
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((pair) => {
            const [k, ...rest] = pair.split('=')
            if (k) obj[k.trim()] = rest.join('=').trim()
          })
        return obj
      }
      case 'segment':
        return segmentId
      case 'topic':
        return topic
      default:
        return null
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateNotificationPayload = {
        app_id: appId,
        title,
        body,
        image_url: imageUrl || null,
        deep_link: deepLink || null,
        data: data.reduce<Record<string, string>>((acc, kv) => {
          if (kv.key) acc[kv.key] = kv.value
          return acc
        }, {}),
        ttl: Number(ttl) || 2419200,
        priority,
        collapse_key: collapseKey || null,
        channel_id: channelId || null,
        audience: { type: audienceType, value: buildAudienceValue() },
        schedule:
          scheduleMode === 'later' && sendAt
            ? { send_at: new Date(sendAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            : { send_at: null },
      }
      return notificationsApi.create(payload)
    },
    onSuccess: (res) => {
      toast.success(
        res.status === 'scheduled'
          ? 'Notification scheduled'
          : `Notification queued${res.estimated_recipients ? ` · ~${formatNumber(res.estimated_recipients)} recipients` : ''}`,
      )
      qc.invalidateQueries({ queryKey: ['notifications', appId] })
      reset()
      onClose()
      if (res.id) navigate(`/notifications/${res.id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not send notification')),
  })

  const canSubmit = title.trim() && body.trim() && (scheduleMode === 'now' || sendAt)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New notification"
      description="Compose and target a push notification."
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit}>
            {scheduleMode === 'later' ? 'Schedule' : 'Send now'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: content */}
        <div className="space-y-4 lg:col-span-3">
          <div>
            <Label htmlFor="n-title">Title</Label>
            <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Breaking news" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="n-body">Message</Label>
            <Textarea id="n-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What do you want to say?" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="n-image">Image URL</Label>
              <Input id="n-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/banner.png" />
            </div>
            <div>
              <Label htmlFor="n-deep">Deep link</Label>
              <Input id="n-deep" value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="myapp://article/42" />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Custom data</Label>
              <button
                type="button"
                onClick={() => setData((d) => [...d, { key: '', value: '' }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add key
              </button>
            </div>
            {data.length === 0 && <p className="text-xs text-muted-foreground">Optional key/value payload sent with the push.</p>}
            <div className="space-y-2">
              {data.map((kv, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="key"
                    className="min-w-0"
                    value={kv.key}
                    onChange={(e) => setData((d) => d.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  />
                  <Input
                    placeholder="value"
                    className="min-w-0"
                    value={kv.value}
                    onChange={(e) => setData((d) => d.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setData((d) => d.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="min-w-0">
              <Label htmlFor="n-priority">Priority</Label>
              <Select id="n-priority" value={priority} onChange={(e) => setPriority(e.target.value as 'high' | 'normal')}>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="n-ttl">TTL (seconds)</Label>
              <Input id="n-ttl" type="number" min={0} value={ttl} onChange={(e) => setTtl(Number(e.target.value))} />
            </div>
            <div className="min-w-0">
              <Label htmlFor="n-channel">Channel ID</Label>
              <Input id="n-channel" value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="default" />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Label htmlFor="n-collapse">Collapse key</Label>
              <Input id="n-collapse" value={collapseKey} onChange={(e) => setCollapseKey(e.target.value)} placeholder="Optional grouping key" />
            </div>
          </div>

          <div>
            <Label>Audience</Label>
            <div className="grid grid-cols-2 gap-2">
              {audienceOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAudienceType(o.value)}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition-colors',
                    audienceType === o.value ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground">{o.hint}</p>
                </button>
              ))}
            </div>

            <div className="mt-3">
              {(audienceType === 'user_ids' || audienceType === 'device_ids' || audienceType === 'tags') && (
                <Textarea
                  rows={3}
                  value={audienceText}
                  onChange={(e) => setAudienceText(e.target.value)}
                  placeholder={
                    audienceType === 'tags' ? 'premium=true, country=BD' : 'id-1, id-2, id-3'
                  }
                />
              )}
              {audienceType === 'segment' && (
                <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
                  <option value="">Select a segment…</option>
                  {segments.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatNumber(s.count)})
                    </option>
                  ))}
                </Select>
              )}
              {audienceType === 'topic' && (
                <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option value="">Select a topic…</option>
                  {topics.data?.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({formatNumber(t.subscribers)})
                    </option>
                  ))}
                </Select>
              )}
              {audienceType === 'all' && (
                <Badge tone="primary" className="mt-1">
                  <Users2 className="h-3.5 w-3.5" /> All subscribed devices
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label>Delivery</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={cn(
                  'flex-1 rounded-xl border p-2.5 text-sm font-medium transition-colors',
                  scheduleMode === 'now' ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                )}
              >
                Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('later')}
                className={cn(
                  'flex-1 rounded-xl border p-2.5 text-sm font-medium transition-colors',
                  scheduleMode === 'later' ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                )}
              >
                Schedule
              </button>
            </div>
            {scheduleMode === 'later' && (
              <div className="mt-2">
                <DateTimePicker value={sendAt} onChange={setSendAt} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: live device preview (sticky on desktop, stacked below the form on mobile) */}
        <div className="border-t border-border pt-5 lg:col-span-2 lg:border-t-0 lg:pt-0">
          <div className="lg:sticky lg:top-0">
            <Label>Preview</Label>
            <DevicePreview title={title} body={body} imageUrl={imageUrl || undefined} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
