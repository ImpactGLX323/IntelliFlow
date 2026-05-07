import { requestJson } from './apiClient';

export const integrationsApi = {
  getRegistry: (session) => requestJson(session, '/integrations/free/registry'),
  getStatus: (session) => requestJson(session, '/integrations/free/status'),
  getWarehouses: (session, params) => requestJson(session, '/integrations/free/warehouses/malaysia', { params }),
  getNearbyWarehouses: (session, params) => requestJson(session, '/integrations/free/warehouses/nearby', { params }),
  getPortRisk: (session, params) => requestJson(session, '/integrations/free/logistics/malaysia-port-risk', { params }),
  getDemandSignals: (session, params) => requestJson(session, '/integrations/free/market/malaysia-demand-signals', { params }),
  getBnmRates: (session, params) => requestJson(session, '/integrations/free/finance/bnm-rates', { params }),
  getMarketplaceProviders: (session) => requestJson(session, '/integrations/marketplaces/providers'),
  connectMarketplaceProvider: (session, provider) =>
    requestJson(session, `/integrations/marketplaces/${provider}/connect`, { method: 'POST' }),
  getOwnSalesBestSellers: (session, params) =>
    requestJson(session, '/integrations/marketplaces/own-sales/best-sellers/weekly', { params }),
  getMarketWideBestSellers: (session) =>
    requestJson(session, '/integrations/market-intelligence/malaysia-best-sellers/weekly'),
};
