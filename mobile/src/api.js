import {
  copilotQuery,
  demoBootstrap,
  demoLogin,
  getInventorySummary,
  getMcpRegistry,
  getPublicAppConfig,
  healthCheck,
  readyCheck,
  requestJson,
} from './services/apiClient';
import { integrationsApi } from './services/integrationsApi';

export { demoBootstrap, demoLogin, getInventorySummary, getMcpRegistry, getPublicAppConfig, healthCheck, readyCheck };

export const apiRequest = requestJson;

export const api = {
  getMe: (session) => requestJson(session, '/api/auth/me'),
  getDashboard: (session) => requestJson(session, '/api/analytics/dashboard'),
  getInventoryRisks: (session) => requestJson(session, '/api/analytics/inventory-risks'),
  getProducts: (session) => requestJson(session, '/api/products/'),
  createProduct: (session, payload) => requestJson(session, '/api/products/', { method: 'POST', body: payload }),
  getWarehouses: (session) => requestJson(session, '/api/warehouses'),
  createWarehouse: (session, payload) => requestJson(session, '/api/warehouses', { method: 'POST', body: payload }),
  getStockPosition: (session, productId, warehouseId) =>
    requestJson(session, `/api/inventory/stock/${productId}`, { params: { warehouse_id: warehouseId } }),
  getInventoryTransactions: (session, params) => requestJson(session, '/api/inventory/transactions', { params }),
  receiveInventory: (session, payload) => requestJson(session, '/api/inventory/receive', { method: 'POST', body: payload }),
  adjustInventory: (session, payload) => requestJson(session, '/api/inventory/adjust', { method: 'POST', body: payload }),
  transferInventory: (session, payload) => requestJson(session, '/api/inventory/transfer', { method: 'POST', body: payload }),
  getReorderSuggestions: (session) => requestJson(session, '/api/reorder/suggestions'),
  getCustomers: (session) => requestJson(session, '/api/customers/'),
  createCustomer: (session, payload) => requestJson(session, '/api/customers/', { method: 'POST', body: payload }),
  getSalesOrders: (session, statusFilter) =>
    requestJson(session, '/api/sales-orders/', { params: { status_filter: statusFilter } }),
  createSalesOrder: (session, payload) => requestJson(session, '/api/sales-orders/', { method: 'POST', body: payload }),
  confirmSalesOrder: (session, orderId) =>
    requestJson(session, `/api/sales-orders/${orderId}/confirm`, { method: 'POST' }),
  fulfillSalesOrderItem: (session, orderId, itemId, quantity) =>
    requestJson(session, `/api/sales-orders/${orderId}/items/${itemId}/fulfill`, { method: 'POST', body: { quantity } }),
  getSales: (session) => requestJson(session, '/api/sales/'),
  createSale: (session, payload) => requestJson(session, '/api/sales/', { method: 'POST', body: payload }),
  getEInvoiceSummary: (session) => requestJson(session, '/api/einvoicing/summary'),
  getEInvoiceDocuments: (session) => requestJson(session, '/api/einvoicing/documents'),
  createEInvoiceFromSale: (session, saleId, payload) =>
    requestJson(session, `/api/einvoicing/from-sale/${saleId}`, { method: 'POST', body: payload }),
  getSuppliers: (session) => requestJson(session, '/api/suppliers/'),
  createSupplier: (session, payload) => requestJson(session, '/api/suppliers/', { method: 'POST', body: payload }),
  getPurchaseOrders: (session, statusFilter) =>
    requestJson(session, '/api/purchase-orders/', { params: { status_filter: statusFilter } }),
  createPurchaseOrder: (session, payload) =>
    requestJson(session, '/api/purchase-orders/', { method: 'POST', body: payload }),
  markPurchaseOrderOrdered: (session, purchaseOrderId) =>
    requestJson(session, `/api/purchase-orders/${purchaseOrderId}/mark-ordered`, { method: 'POST' }),
  receivePurchaseOrderItem: (session, orderId, itemId, quantity) =>
    requestJson(session, `/api/purchase-orders/${orderId}/items/${itemId}/receive`, { method: 'POST', body: { quantity } }),
  getReturns: (session) => requestJson(session, '/api/returns/'),
  createReturnOrder: (session, payload) => requestJson(session, '/api/returns/', { method: 'POST', body: payload }),
  approveReturnOrder: (session, returnOrderId) =>
    requestJson(session, `/api/returns/${returnOrderId}/approve`, { method: 'POST' }),
  receiveReturnItem: (session, returnId, itemId, quantity) =>
    requestJson(session, `/api/returns/${returnId}/items/${itemId}/receive`, { method: 'POST', body: { quantity } }),
  getProfitLeakage: (session, startDate, endDate) =>
    requestJson(session, '/api/returns/analytics/profit-leakage', { params: { start_date: startDate, end_date: endDate } }),
  getHighReturnProducts: (session, startDate, endDate) =>
    requestJson(session, '/api/returns/analytics/high-return-products', { params: { start_date: startDate, end_date: endDate } }),
  getShipments: (session) => requestJson(session, '/api/shipments'),
  createShipment: (session, payload) => requestJson(session, '/api/shipments', { method: 'POST', body: payload }),
  updateShipmentStatus: (session, shipmentId, payload) =>
    requestJson(session, `/api/shipments/${shipmentId}/status`, { method: 'POST', body: payload }),
  addShipmentLeg: (session, shipmentId, payload) =>
    requestJson(session, `/api/shipments/${shipmentId}/legs`, { method: 'POST', body: payload }),
  getDelayedShipments: (session) => requestJson(session, '/api/shipments/analytics/delayed'),
  getDelayImpact: (session, shipmentId) => requestJson(session, `/api/shipments/${shipmentId}/delay-impact`),
  getRoutes: (session) => requestJson(session, '/api/routes'),
  getPorts: (session) => requestJson(session, '/api/ports'),
  getPublicIndoPacificShipFlow: (session, params) =>
    requestJson(session, '/public/logistics/indo-pacific-ship-flow', { params }),
  getIntegrationsRegistry: (session) => integrationsApi.getRegistry(session),
  getIntegrationsStatus: (session) => integrationsApi.getStatus(session),
  getMalaysiaWarehouses: (session, params) => integrationsApi.getWarehouses(session, params),
  getNearbyMalaysiaWarehouses: (session, params) => integrationsApi.getNearbyWarehouses(session, params),
  getMalaysiaPortRiskPreview: (session, params) => integrationsApi.getPortRisk(session, params),
  getMalaysiaDemandSignals: (session, params) => integrationsApi.getDemandSignals(session, params),
  getBnmRates: (session, params) => integrationsApi.getBnmRates(session, params),
  getMarketplaceProviders: (session) => integrationsApi.getMarketplaceProviders(session),
  connectMarketplaceProvider: (session, provider) => integrationsApi.connectMarketplaceProvider(session, provider),
  getOwnSalesBestSellers: (session, params) => integrationsApi.getOwnSalesBestSellers(session, params),
  getMarketWideBestSellers: (session) => integrationsApi.getMarketWideBestSellers(session),
  getCapabilities: (session) => requestJson(session, '/api/ai/capabilities'),
  getRecommendations: (session, params) => requestJson(session, '/api/ai/recommendations', { params }),
  getNotifications: (session, params) => requestJson(session, '/api/notifications/', { params }),
  getNotificationUnreadCount: (session) => requestJson(session, '/api/notifications/unread-count'),
  markNotificationRead: (session, notificationId) =>
    requestJson(session, `/api/notifications/${notificationId}/read`, { method: 'POST' }),
  getNotificationPreferences: (session) => requestJson(session, '/api/notifications/preferences'),
  updateNotificationPreference: (session, category, payload) =>
    requestJson(session, `/api/notifications/preferences/${category}`, { method: 'PUT', body: payload }),
  registerNotificationDevice: (session, payload) =>
    requestJson(session, '/api/notifications/devices', { method: 'POST', body: payload }),
  askCopilot: (session, payload) =>
    copilotQuery(session, {
      ...payload,
      user_plan: payload?.user_plan || session?.plan || 'FREE',
      user_id:
        payload?.user_id != null
          ? String(payload.user_id)
          : session?.userId != null
            ? String(session.userId)
            : null,
    }),
  getInsights: (session) => requestJson(session, '/api/ai/insights'),
};
