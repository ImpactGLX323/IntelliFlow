import { apiClient } from '@/lib/api/client'

export const authAPI = {
  register: (email: string, password: string, fullName?: string) =>
    apiClient.post('/api/auth/register', { email, password, full_name: fullName }),
  login: (email: string, password: string) =>
    apiClient.post('/api/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  getMe: () => apiClient.get('/api/auth/me'),
}
