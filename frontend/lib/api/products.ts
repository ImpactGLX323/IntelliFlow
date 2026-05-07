import { apiClient } from '@/lib/api/client'

export const productsAPI = {
  getAll: () => apiClient.get('/api/products/'),
  getById: (id: number | string) => apiClient.get(`/api/products/${id}`),
  exportCsv: () => apiClient.get('/api/products/export/csv', { responseType: 'blob' }),
  importCsv: (csvText: string) => apiClient.post('/api/products/import/csv', { csv_text: csvText }),
  create: (data: unknown) => apiClient.post('/api/products/', data),
  update: (id: number | string, data: unknown) => apiClient.put(`/api/products/${id}`, data),
  delete: (id: number | string) => apiClient.delete(`/api/products/${id}`),
}
