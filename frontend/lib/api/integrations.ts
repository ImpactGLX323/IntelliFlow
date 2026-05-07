import { apiClient } from '@/lib/api/client'

export const integrationsAPI = {
  getRegistry: () => apiClient.get('/integrations/free/registry'),
  getStatus: () => apiClient.get('/integrations/free/status'),
  getWarehouses: (params?: Record<string, unknown>) => apiClient.get('/integrations/free/warehouses/malaysia', { params }),
  getNearbyWarehouses: (params: Record<string, unknown>) => apiClient.get('/integrations/free/warehouses/nearby', { params }),
  getPortRisk: (params?: Record<string, unknown>) => apiClient.get('/integrations/free/logistics/malaysia-port-risk', { params }),
  getDemandSignals: (params?: Record<string, unknown>) => apiClient.get('/integrations/free/market/malaysia-demand-signals', { params }),
  getBnmRates: (params?: Record<string, unknown>) => apiClient.get('/integrations/free/finance/bnm-rates', { params }),
  getMarketplaceProviders: () => apiClient.get('/integrations/marketplaces/providers'),
  connectMarketplaceProvider: (provider: string) => apiClient.post(`/integrations/marketplaces/${provider}/connect`),
  getOwnSalesBestSellers: (params?: Record<string, unknown>) =>
    apiClient.get('/integrations/marketplaces/own-sales/best-sellers/weekly', { params }),
  getMarketWideBestSellers: () => apiClient.get('/integrations/market-intelligence/malaysia-best-sellers/weekly'),
}
