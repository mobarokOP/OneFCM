import { api } from './client'
import type { AuthResponse, User } from '@/types'

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data
  },
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', { name, email, password })
    return data.data
  },
  async google(credential: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/google', { credential })
    return data.data
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
  async me(): Promise<User> {
    const { data } = await api.get('/auth/me')
    return data.data.user ?? data.data
  },
}
