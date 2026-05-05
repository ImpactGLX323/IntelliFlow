export const navigationItems = [
  {
    key: 'dashboard',
    label: 'Home',
    routeName: 'dashboard',
    shortDescription: 'Operational overview, order flow, and workspace health',
    requiredPlan: 'FREE',
    icon: 'home',
    category: 'workspace',
  },
  {
    key: 'products',
    label: 'Product',
    routeName: 'products',
    shortDescription: 'Catalog records, SKUs, and product setup',
    requiredPlan: 'FREE',
    icon: 'box',
    category: 'workspace',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    routeName: 'inventory',
    shortDescription: 'Stock ledger, warehouses, transfers, and low-stock visibility',
    requiredPlan: 'FREE',
    icon: 'layers',
    category: 'workspace',
  },
  {
    key: 'logistics',
    label: 'Logistics',
    routeName: 'logistics',
    shortDescription: 'Port pressure, route flow, and shipment delay intelligence',
    requiredPlan: 'BOOST',
    icon: 'ship',
    category: 'operations',
  },
  {
    key: 'compliance',
    label: 'MCP + RAG',
    routeName: 'compliance',
    shortDescription: 'AI tools, compliance retrieval, and structured recommendations',
    requiredPlan: 'PREMIUM',
    icon: 'spark',
    category: 'operations',
  },
  {
    key: 'einvoicing',
    label: 'E-Invoicing',
    routeName: 'compliance',
    shortDescription: 'Malaysia-ready transaction workflows and compliance context',
    requiredPlan: 'PREMIUM',
    icon: 'receipt',
    category: 'operations',
  },
  {
    key: 'plans',
    label: 'Plans',
    routeName: 'plans',
    shortDescription: 'Free, Premium, and Boost workspace capabilities',
    requiredPlan: 'FREE',
    icon: 'crown',
    category: 'commercial',
  },
  {
    key: 'copilot',
    label: 'AI Copilot',
    routeName: 'copilot',
    shortDescription: 'MCP-backed assistant for inventory, logistics, and compliance',
    requiredPlan: 'FREE',
    icon: 'bot',
    category: 'operations',
  },
  {
    key: 'account',
    label: 'Profile',
    routeName: 'account',
    shortDescription: 'Workspace identity, account details, and plan context',
    requiredPlan: 'FREE',
    icon: 'user',
    category: 'account',
  },
];

export const trackerOrder = navigationItems.map((item) => item.key);

export function getNavigationItemByRoute(routeName) {
  return navigationItems.find((item) => item.routeName === routeName || item.key === routeName) || navigationItems[0];
}
