export interface Product {
  id: number
  name: string
  sku: string
  description: string | null
  category: string | null
  price: number
  cost: number
  current_stock: number
  on_hand: number
  reserved: number
  available_stock: number
  min_stock_threshold: number
  supplier: string | null
}
