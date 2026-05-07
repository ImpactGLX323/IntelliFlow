export interface DashboardTopSeller {
  product_id: number
  product_name: string
  total_quantity: number
  total_revenue: number
  total_sales: number
}

export interface DashboardTrend {
  date: string
  revenue: number
  quantity: number
  order_count: number
}

export interface DashboardStats {
  total_revenue: number
  total_orders: number
  total_products: number
  low_stock_alerts: number
  top_sellers: DashboardTopSeller[]
  recent_trends: DashboardTrend[]
}

export interface InventoryRisk {
  product_id: number
  product_name: string
  available_stock: number
  current_stock: number
  min_threshold: number
  days_of_stock: number | null
  risk_level: string
}
