export interface ReturnOrderItem {
  id: number
  return_order_id: number
  product_id: number
  warehouse_id: number | null
  quantity: number
  return_reason: 'DAMAGED_ON_ARRIVAL' | 'WRONG_ITEM' | 'DEFECTIVE' | 'CUSTOMER_CHANGED_MIND' | 'LATE_DELIVERY' | 'OTHER'
  condition: 'RESTOCKABLE' | 'DAMAGED' | 'SCRAP' | 'QUARANTINE'
  refund_amount: number
  replacement_cost: number
  supplier_id: number | null
  carrier_name: string | null
  created_at: string
  updated_at: string | null
}

export interface ReturnOrder {
  id: number
  return_number: string
  sales_order_id: number | null
  customer_id: number | null
  status: 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED'
  return_date: string
  refund_amount: number
  replacement_cost: number
  notes: string | null
  created_at: string
  updated_at: string | null
  items: ReturnOrderItem[]
}

export interface ProfitLeakageLine {
  product_id: number
  refund_amount: number
  replacement_cost: number
  total_leakage: number
}

export interface ProfitLeakageReport {
  start_date: string
  end_date: string
  total_refunds: number
  total_replacement_cost: number
  total_profit_leakage: number
  by_product: ProfitLeakageLine[]
}
