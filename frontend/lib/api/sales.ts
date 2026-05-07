import { apiClient } from '@/lib/api/client'

export const salesAPI = {
  getAll: (params?: Record<string, unknown>) => apiClient.get('/api/sales/', { params }),
  getById: (id: number | string) => apiClient.get(`/api/sales/${id}`),
  exportCsv: () => apiClient.get('/api/sales/export/csv', { responseType: 'blob' }),
  create: (data: unknown) => apiClient.post('/api/sales/', data),
}
