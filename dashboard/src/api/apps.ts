import { api, unwrap } from './client'
import type { Application } from '@/types'

export interface CreateAppPayload {
  name: string
  package_name: string
  /** Parsed Firebase service-account JSON. Project id, sender id, etc. are derived server-side. */
  fcm_service_account?: Record<string, unknown>
}

export type UpdateAppPayload = Partial<CreateAppPayload> & {
  status?: string
  rate_limit?: number
}

export const appsApi = {
  async list(): Promise<Application[]> {
    const { data } = await api.get('/apps')
    return data.data ?? []
  },
  async get(id: string): Promise<Application> {
    const { data } = await api.get(`/apps/${id}`)
    return unwrap<Application>(data)
  },
  async create(payload: CreateAppPayload): Promise<Application> {
    const { data } = await api.post('/apps', payload)
    return unwrap<Application>(data)
  },
  async update(id: string, payload: UpdateAppPayload): Promise<Application> {
    const { data } = await api.patch(`/apps/${id}`, payload)
    return unwrap<Application>(data)
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/apps/${id}`)
  },
}
