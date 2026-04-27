export interface WarehouseLocation {
  id: number
  warehouse_id: number
  name: string
  code: string | null
  location_type: 'BIN' | 'SHELF' | 'DOCK' | 'QUARANTINE' | 'DAMAGED' | 'PICKING' | 'STORAGE'
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface PickListItem {
  id: number
  pick_list_id: number
  sales_order_item_id: number
  product_id: number
  warehouse_id: number
  warehouse_location_id: number | null
  quantity_to_pick: number
  quantity_picked: number
  created_at: string
  updated_at: string | null
}

export interface PickList {
  id: number
  sales_order_id: number
  status: 'OPEN' | 'PICKING' | 'PICKED' | 'CANCELLED'
  created_at: string
  updated_at: string | null
  items: PickListItem[]
}

export interface PackingRecord {
  id: number
  sales_order_id: number
  status: 'OPEN' | 'PACKED' | 'CANCELLED'
  package_reference: string | null
  created_at: string
  updated_at: string | null
}

export interface CycleCountItem {
  id: number
  cycle_count_id: number
  product_id: number
  warehouse_location_id: number | null
  expected_quantity: number
  counted_quantity: number | null
  variance: number | null
  created_at: string
  updated_at: string | null
}

export interface CycleCount {
  id: number
  warehouse_id: number
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
  created_at: string
  completed_at: string | null
  items: CycleCountItem[]
}
