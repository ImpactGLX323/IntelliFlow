import { apiClient } from '@/lib/api/client'

export const analyticsAPI = {
  getDashboard: () => apiClient.get('/api/analytics/dashboard'),
  getBestSellers: (days?: number, limit?: number) =>
    apiClient.get('/api/analytics/best-sellers', { params: { days, limit } }),
  getInventoryRisks: () => apiClient.get('/api/analytics/inventory-risks'),
}
