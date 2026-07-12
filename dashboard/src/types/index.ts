export interface ListMeta {
  page: number
  per_page: number
  total: number
  /** History limits enforced by the server (absent on endpoints without retention). */
  retention?: {
    notifications_per_app?: number
    delivery_log_days?: number
  }
}

export interface Paginated<T> {
  data: T[]
  meta: ListMeta
}

export interface User {
  id: string
  name: string
  email: string
  created_at?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface AppStats {
  devices: number
  users: number
  sent_30d: number
}

export interface AppFcm {
  project_id: string | null
  synced: boolean
  synced_at: string | null
  sender_id: string | null
  package_name: string | null
  error: string | null
}

export interface Application {
  id: string
  name: string
  package_name: string
  fcm?: AppFcm | null
  has_service_account?: boolean
  status: 'active' | 'paused' | 'disabled' | string
  rate_limit: number | null
  created_at: string
  stats?: AppStats
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  key?: string
  created_at: string
  last_used_at?: string | null
}

export interface Device {
  id: string
  external_id: string | null
  fcm_token: string
  app_version: string | null
  os_version: string | null
  language: string | null
  country: string | null
  timezone: string | null
  last_active_at: string | null
  notification_permission: boolean | string | null
  created_at: string
}

export interface AppUser {
  id: string
  external_id: string | null
  devices?: number
  country?: string | null
  language?: string | null
  last_active_at?: string | null
  created_at: string
}

export interface Topic {
  name: string
  subscribers: number
}

export type SegmentOp = 'eq' | 'neq' | 'exists' | 'contains'

export interface SegmentFilter {
  field: string
  op: SegmentOp
  value?: string
}

export interface Segment {
  id: string
  name: string
  type: 'dynamic' | 'static'
  filters: SegmentFilter[]
  count: number
  created_at?: string
}

export type AudienceType = 'all' | 'user_ids' | 'device_ids' | 'tags' | 'segment' | 'topic'

export interface NotificationStats {
  sent: number
  delivered: number
  failed: number
  opened: number
  ctr: number
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  image_url?: string | null
  deep_link?: string | null
  priority?: 'high' | 'normal' | string
  status: 'queued' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled' | string
  audience?: { type: AudienceType; value?: unknown }
  estimated_recipients?: number
  data?: Record<string, string>
  ttl?: number
  channel_id?: string | null
  schedule?: { send_at?: string | null; timezone?: string | null; recurring?: string | null } | null
  stats?: NotificationStats
  created_at: string
}

export interface CreateNotificationPayload {
  app_id: string
  title: string
  body: string
  image_url?: string | null
  deep_link?: string | null
  data?: Record<string, string>
  ttl?: number
  priority?: 'high' | 'normal'
  collapse_key?: string | null
  channel_id?: string | null
  audience: { type: AudienceType; value?: unknown }
  schedule?: { send_at?: string | null; timezone?: string | null; recurring?: string | null }
}

export interface DeliveryLog {
  device_id: string
  status: string
  fcm_message_id?: string | null
  error?: string | null
  retry_count: number
  attempted_at: string
}

export interface TimeseriesPoint {
  date: string
  sent: number
  delivered: number
  opened: number
}

export interface BreakdownPoint {
  label: string
  value: number
}

export interface Analytics {
  sent: number
  delivered: number
  failed: number
  opened: number
  ctr: number
  timeseries: TimeseriesPoint[]
  by_country: BreakdownPoint[]
  by_os: BreakdownPoint[]
}

export interface AnalyticsOverview {
  devices: number
  users: number
  sent_30d: number
  ctr: number
  timeseries: TimeseriesPoint[]
  recent_notifications?: NotificationItem[]
}
