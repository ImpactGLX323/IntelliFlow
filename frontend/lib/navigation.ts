export type AppPlan = 'FREE' | 'PREMIUM' | 'BOOST'

export interface NavigationItemMeta {
  key: string
  label: string
  href: string
  shortDescription: string
  requiredPlan: AppPlan
  category: 'workspace' | 'operations' | 'commercial' | 'account'
}

export const navigationItems: NavigationItemMeta[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/dashboard',
    shortDescription: 'Operational overview, order flow, and workspace health.',
    requiredPlan: 'FREE',
    category: 'workspace',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/inventory',
    shortDescription: 'Stock ledger, low-stock visibility, and warehouse coverage.',
    requiredPlan: 'FREE',
    category: 'workspace',
  },
  {
    key: 'sales',
    label: 'Sales',
    href: '/sales',
    shortDescription: 'Orders, sell-through movement, and sales intelligence.',
    requiredPlan: 'PREMIUM',
    category: 'workspace',
  },
  {
    key: 'purchasing',
    label: 'Purchasing',
    href: '/purchasing',
    shortDescription: 'Supplier orders, receiving, reorder planning, and inbound control.',
    requiredPlan: 'PREMIUM',
    category: 'workspace',
  },
  {
    key: 'returns',
    label: 'Returns',
    href: '/returns',
    shortDescription: 'Refunds, leakage analysis, and reverse logistics context.',
    requiredPlan: 'PREMIUM',
    category: 'workspace',
  },
  {
    key: 'logistics',
    label: 'Logistics',
    href: '/logistics',
    shortDescription: 'Port pressure, shipment delay intelligence, and route health.',
    requiredPlan: 'BOOST',
    category: 'operations',
  },
  {
    key: 'mcp-rag',
    label: 'MCP + RAG',
    href: '/compliance',
    shortDescription: 'AI tools, compliance retrieval, and structured recommendations.',
    requiredPlan: 'PREMIUM',
    category: 'operations',
  },
  {
    key: 'einvoicing',
    label: 'E-Invoicing',
    href: '/einvoicing',
    shortDescription: 'LHDN-ready transaction workflows and compliance readiness.',
    requiredPlan: 'PREMIUM',
    category: 'operations',
  },
  {
    key: 'plans',
    label: 'Plans',
    href: '/plans',
    shortDescription: 'Free, Premium, and Boost workspace capabilities.',
    requiredPlan: 'FREE',
    category: 'commercial',
  },
  {
    key: 'copilot',
    label: 'AI Copilot',
    href: '/copilot',
    shortDescription: 'MCP-backed assistant for inventory, logistics, and compliance.',
    requiredPlan: 'FREE',
    category: 'operations',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/alerts',
    shortDescription: 'Unread alerts, notification preferences, and operational exceptions.',
    requiredPlan: 'FREE',
    category: 'operations',
  },
  {
    key: 'profile',
    label: 'Profile',
    href: '/profile',
    shortDescription: 'Account identity, workspace plan, and security context.',
    requiredPlan: 'FREE',
    category: 'account',
  },
]

export const workspaceNavigation = navigationItems.filter((item) => item.category === 'workspace')
export const operationsNavigation = navigationItems.filter((item) => item.category === 'operations')
export const commercialNavigation = navigationItems.filter((item) => item.category === 'commercial')
export const accountNavigation = navigationItems.filter((item) => item.category === 'account')

export function normalizePlanLabel(plan?: string | null): AppPlan {
  if (!plan) return 'FREE'
  const normalized = plan.toUpperCase()
  if (normalized === 'PRO') return 'PREMIUM'
  if (normalized === 'BOOST') return 'BOOST'
  return 'FREE'
}

export function findNavigationItem(pathname: string) {
  return navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navigationItems[0]
}
