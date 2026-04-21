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
