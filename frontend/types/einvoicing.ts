export interface EInvoiceDocument {
  id: number
  sale_id: number
  document_number: string
  status: string
  invoice_type: string
  currency: string
  buyer_name: string | null
  buyer_email: string | null
  buyer_tin: string | null
  seller_name: string
  seller_tin: string | null
  issue_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  validation_status: string
  validation_notes: string[]
  line_items: Array<Record<string, unknown>>
  lhdn_reference: string | null
  created_at: string
  updated_at: string | null
}

export interface EInvoiceSummary {
  total_documents: number
  ready_documents: number
  missing_tax_identity: number
  total_invoice_value: number
}
