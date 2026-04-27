export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string | null
}

export interface Sale {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  customer_id: string | null
  order_id: string | null
}

export interface SalesOrderItem {
  id: number
  sales_order_id: number
  product_id: number
  warehouse_id: number | null
  quantity_ordered: number
  quantity_reserved: number
  quantity_fulfilled: number
  unit_price: number
  created_at: string
  updated_at: string | null
}

export interface SalesOrder {
  id: number
  order_number: string
  customer_id: number | null
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED'
  order_date: string
  expected_ship_date: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  items: SalesOrderItem[]
}
