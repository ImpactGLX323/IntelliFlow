export interface Supplier {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  lead_time_days: number | null
  created_at: string
  updated_at: string | null
}

export interface PurchaseOrderItem {
  id: number
  purchase_order_id: number
  product_id: number
  warehouse_id: number | null
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  created_at: string
  updated_at: string | null
}

export interface PurchaseOrder {
  id: number
  po_number: string
  supplier_id: number | null
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  order_date: string
  expected_arrival_date: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  items: PurchaseOrderItem[]
}
