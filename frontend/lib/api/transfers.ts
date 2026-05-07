import { apiClient } from '@/lib/api/client'

export const transfersAPI = {
  getWarehouses: () => apiClient.get('/api/warehouses'),
  createWarehouse: (data: unknown) => apiClient.post('/api/warehouses', data),
  getTransactions: (params?: { transaction_type?: string; warehouse_id?: number | null; product_id?: number | null }) =>
    apiClient.get('/api/inventory/transactions', { params }),
  createTransfer: (data: unknown) => apiClient.post('/api/inventory/transfer', data),
}
