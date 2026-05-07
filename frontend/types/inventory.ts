export interface InventoryTransaction {
  id: number
  product_id: number
  warehouse_id: number
  transaction_type: string
  quantity: number
  direction: 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'NEUTRAL'
  reference_type: string | null
  reference_id: string | null
  reason: string | null
  notes: string | null
  created_by: number | null
  approved_by: number | null
  created_at: string
}

export interface Warehouse {
  id: number
  name: string
  code: string
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface StockPosition {
  product_id: number
  warehouse_id: number | null
  on_hand: number
  reserved: number
  available: number
  damaged: number
  quarantined: number
}

export interface InventoryAdjustment {
  product_id: number
  warehouse_id: number
  quantity: number
  adjustment_type: 'POSITIVE' | 'NEGATIVE'
  reason: string
  notes?: string | null
}

export interface ReorderPoint {
  id: number
  product_id: number
  warehouse_id: number
  minimum_quantity: number
  reorder_quantity: number
  created_at: string
  updated_at: string | null
}

export interface ReorderSuggestion {
  product_id: number
  warehouse_id: number
  available_quantity: number
  minimum_quantity: number
  suggested_reorder_quantity: number
  supplier_name: string | null
  supplier_lead_time_days: number | null
}
