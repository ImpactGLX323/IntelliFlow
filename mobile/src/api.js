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
  getCapabilities: (session) => requestJson(session, '/api/ai/capabilities'),
  getRecommendations: (session, params) => requestJson(session, '/api/ai/recommendations', { params }),
  askCopilot: (session, payload) =>
    copilotQuery(session, {
      ...payload,
      user_plan: payload?.user_plan || session?.plan || 'FREE',
      user_id: payload?.user_id || session?.userId || null,
    }),
  getInsights: (session) => requestJson(session, '/api/ai/insights'),
};
