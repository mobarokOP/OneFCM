import { api, unwrap } from './client'
import type { CreateNotificationPayload, NotificationItem, Paginated } from '@/types'

export const notificationsApi = {
  async list(appId: string, page = 1): Promise<Paginated<NotificationItem>> {
    const { data } = await api.get(`/apps/${appId}/notifications`, { params: { page } })
    return {
      data: data.data ?? [],
      meta: data.meta ?? { page: 1, per_page: 20, total: (data.data ?? []).length },
    }
  },
  async get(appId: string, id: string): Promise<NotificationItem> {
    // Admin-scoped detail — returns full content (image, deep link, custom data).
    const { data } = await api.get(`/apps/${appId}/notifications/${id}`)
    return unwrap<NotificationItem>(data)
  },
  async create(payload: CreateNotificationPayload): Promise<NotificationItem> {
    const { data } = await api.post('/notifications', payload)
    return unwrap<NotificationItem>(data)
  },
  async cancel(appId: string, id: string): Promise<void> {
    await api.post(`/apps/${appId}/notifications/${id}/cancel`)
  },
  async remove(appId: string, id: string): Promise<void> {
    await api.delete(`/apps/${appId}/notifications/${id}`)
  },
}
