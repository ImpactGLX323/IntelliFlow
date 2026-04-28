const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function buildUrl(baseUrl, path, params) {
  const normalizedBase = (baseUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseError(response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item) => item?.msg || JSON.stringify(item)).join(', ');
    }
    return JSON.stringify(data);
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function apiRequest(session, path, options = {}) {
  const { params, body, headers, ...rest } = options;
  const url = buildUrl(session?.apiUrl, path, params);
  const mergedHeaders = {
    ...defaultHeaders,
    ...(headers || {}),
  };

  if (session?.token) {
    mergedHeaders.Authorization = `Bearer ${session.token}`;
  }

  if (body instanceof FormData) {
    delete mergedHeaders['Content-Type'];
  }

  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

export const api = {
  getMe: (session) => apiRequest(session, '/api/auth/me'),
  getDashboard: (session) => apiRequest(session, '/api/analytics/dashboard'),
  getInventoryRisks: (session) => apiRequest(session, '/api/analytics/inventory-risks'),
  getProducts: (session) => apiRequest(session, '/api/products/'),
  createProduct: (session, payload) => apiRequest(session, '/api/products/', { method: 'POST', body: payload }),
  getWarehouses: (session) => apiRequest(session, '/api/warehouses'),
  createWarehouse: (session, payload) => apiRequest(session, '/api/warehouses', { method: 'POST', body: payload }),
  getStockPosition: (session, productId, warehouseId) =>
    apiRequest(session, `/api/inventory/stock/${productId}`, { params: { warehouse_id: warehouseId } }),
  getInventoryTransactions: (session, params) =>
    apiRequest(session, '/api/inventory/transactions', { params }),
  receiveInventory: (session, payload) =>
    apiRequest(session, '/api/inventory/receive', { method: 'POST', body: payload }),
  adjustInventory: (session, payload) =>
    apiRequest(session, '/api/inventory/adjust', { method: 'POST', body: payload }),
  transferInventory: (session, payload) =>
    apiRequest(session, '/api/inventory/transfer', { method: 'POST', body: payload }),
  getReorderSuggestions: (session) => apiRequest(session, '/api/reorder/suggestions'),
  getCustomers: (session) => apiRequest(session, '/api/customers/'),
  createCustomer: (session, payload) => apiRequest(session, '/api/customers/', { method: 'POST', body: payload }),
  getSalesOrders: (session, statusFilter) =>
    apiRequest(session, '/api/sales-orders/', { params: { status_filter: statusFilter } }),
  createSalesOrder: (session, payload) =>
    apiRequest(session, '/api/sales-orders/', { method: 'POST', body: payload }),
  confirmSalesOrder: (session, orderId) =>
    apiRequest(session, `/api/sales-orders/${orderId}/confirm`, { method: 'POST' }),
  fulfillSalesOrderItem: (session, orderId, itemId, quantity) =>
    apiRequest(session, `/api/sales-orders/${orderId}/items/${itemId}/fulfill`, {
      method: 'POST',
      body: { quantity },
    }),
  getSales: (session) => apiRequest(session, '/api/sales/'),
  createSale: (session, payload) => apiRequest(session, '/api/sales/', { method: 'POST', body: payload }),
  getSuppliers: (session) => apiRequest(session, '/api/suppliers/'),
  createSupplier: (session, payload) => apiRequest(session, '/api/suppliers/', { method: 'POST', body: payload }),
  getPurchaseOrders: (session, statusFilter) =>
    apiRequest(session, '/api/purchase-orders/', { params: { status_filter: statusFilter } }),
  createPurchaseOrder: (session, payload) =>
    apiRequest(session, '/api/purchase-orders/', { method: 'POST', body: payload }),
  markPurchaseOrderOrdered: (session, purchaseOrderId) =>
    apiRequest(session, `/api/purchase-orders/${purchaseOrderId}/mark-ordered`, { method: 'POST' }),
  receivePurchaseOrderItem: (session, orderId, itemId, quantity) =>
    apiRequest(session, `/api/purchase-orders/${orderId}/items/${itemId}/receive`, {
      method: 'POST',
      body: { quantity },
    }),
  getReturns: (session) => apiRequest(session, '/api/returns/'),
  createReturnOrder: (session, payload) => apiRequest(session, '/api/returns/', { method: 'POST', body: payload }),
  approveReturnOrder: (session, returnOrderId) =>
    apiRequest(session, `/api/returns/${returnOrderId}/approve`, { method: 'POST' }),
  receiveReturnItem: (session, returnId, itemId, quantity) =>
    apiRequest(session, `/api/returns/${returnId}/items/${itemId}/receive`, {
      method: 'POST',
      body: { quantity },
    }),
  getProfitLeakage: (session, startDate, endDate) =>
    apiRequest(session, '/api/returns/analytics/profit-leakage', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    }),
  getHighReturnProducts: (session, startDate, endDate) =>
    apiRequest(session, '/api/returns/analytics/high-return-products', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    }),
  getShipments: (session) => apiRequest(session, '/api/shipments'),
  createShipment: (session, payload) => apiRequest(session, '/api/shipments', { method: 'POST', body: payload }),
  updateShipmentStatus: (session, shipmentId, payload) =>
    apiRequest(session, `/api/shipments/${shipmentId}/status`, { method: 'POST', body: payload }),
  addShipmentLeg: (session, shipmentId, payload) =>
    apiRequest(session, `/api/shipments/${shipmentId}/legs`, { method: 'POST', body: payload }),
  getDelayedShipments: (session) => apiRequest(session, '/api/shipments/analytics/delayed'),
  getDelayImpact: (session, shipmentId) => apiRequest(session, `/api/shipments/${shipmentId}/delay-impact`),
  getRoutes: (session) => apiRequest(session, '/api/routes'),
  getPorts: (session) => apiRequest(session, '/api/ports'),
  getCapabilities: (session) => apiRequest(session, '/api/ai/capabilities'),
  getRecommendations: (session, params) => apiRequest(session, '/api/ai/recommendations', { params }),
  askCopilot: (session, payload) => apiRequest(session, '/api/ai/ai-copilot', { method: 'POST', body: payload }),
  getInsights: (session) => apiRequest(session, '/api/ai/insights'),
};
