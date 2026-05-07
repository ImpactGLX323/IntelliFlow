import { apiClient } from '@/lib/api/client'

export const purchasingAPI = {
  getAll: (params?: { status_filter?: string }) => apiClient.get('/api/purchase-orders/', { params }),
  exportOrdersCsv: () => apiClient.get('/api/purchase-orders/export/csv', { responseType: 'blob' }),
  create: (data: unknown) => apiClient.post('/api/purchase-orders/', data),
  markOrdered: (purchaseOrderId: number) => apiClient.post(`/api/purchase-orders/${purchaseOrderId}/mark-ordered`),
  receiveItem: (orderId: number, itemId: number, quantity: number) =>
    apiClient.post(`/api/purchase-orders/${orderId}/items/${itemId}/receive`, { quantity }),
  getSuppliers: () => apiClient.get('/api/suppliers/'),
  exportSuppliersCsv: () => apiClient.get('/api/suppliers/export/csv', { responseType: 'blob' }),
  importSuppliersCsv: (csvText: string) => apiClient.post('/api/suppliers/import/csv', { csv_text: csvText }),
  createSupplier: (data: unknown) => apiClient.post('/api/suppliers/', data),
  updateSupplier: (supplierId: number, data: unknown) => apiClient.put(`/api/suppliers/${supplierId}`, data),
}
