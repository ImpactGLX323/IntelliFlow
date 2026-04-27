export interface StockTransfer {
  id: number
  product_id: number
  from_warehouse_id: number
  to_warehouse_id: number
  quantity: number
  status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'
  notes: string | null
  created_at: string
  updated_at: string | null
}
