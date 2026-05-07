import { apiClient } from '@/lib/api/client'

export const returnsAPI = {
  getAll: () => apiClient.get('/api/returns/'),
}
