import { apiClient } from '@/lib/api/client'

export const einvoicingAPI = {
  getSummary: () => apiClient.get('/api/einvoicing/summary'),
  getDocuments: () => apiClient.get('/api/einvoicing/documents'),
  createFromSale: (
    saleId: number,
    payload: {
      buyer_name?: string | null
      buyer_email?: string | null
      buyer_tin?: string | null
      invoice_type?: string
    }
  ) => apiClient.post(`/api/einvoicing/from-sale/${saleId}`, payload),
}
