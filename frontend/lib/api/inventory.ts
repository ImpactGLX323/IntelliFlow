import { apiClient } from '@/lib/api/client'

export const inventoryAPI = {
  getOverview: () => apiClient.get('/api/analytics/inventory-risks'),
  getTransactions: (params?: Record<string, unknown>) => apiClient.get('/api/inventory/transactions', { params }),
  getWarehouses: () => apiClient.get('/api/warehouses'),
  exportWarehousesCsv: () => apiClient.get('/api/warehouses/export/csv', { responseType: 'blob' }),
  importWarehousesCsv: (csvText: string) => apiClient.post('/api/warehouses/import/csv', { csv_text: csvText }),
  createWarehouse: (data: unknown) => apiClient.post('/api/warehouses', data),
  updateWarehouse: (warehouseId: number, data: unknown) => apiClient.put(`/api/warehouses/${warehouseId}`, data),
  receive: (data: unknown) => apiClient.post('/api/inventory/receive', data),
  adjust: (data: unknown) => apiClient.post('/api/inventory/adjust', data),
}
