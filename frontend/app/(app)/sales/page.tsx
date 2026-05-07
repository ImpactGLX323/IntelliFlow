'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import QuickProductCreateForm from '@/components/ui/QuickProductCreateForm'
import StructuredDataPanel from '@/components/ui/StructuredDataPanel'
import { copilotAPI, productsAPI, salesAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import type { AICapabilities, CopilotQueryResponse } from '@/types/copilot'
import type { Product } from '@/types/product'
import type { Sale } from '@/types/sales'

interface SalesFormState {
  product_id: string
  quantity: string
  unit_price: string
  sale_date: string
  customer_id: string
  order_id: string
}

const initialForm: SalesFormState = {
  product_id: '',
  quantity: '',
  unit_price: '',
  sale_date: new Date().toISOString().split('T')[0],
  customer_id: '',
  order_id: '',
}

function toDisplayLabel(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ')
}

function formatInsightValue(key: string, value: unknown) {
  if (typeof value === 'number') {
    if (/(revenue|price|amount|margin|cost|value)/i.test(key)) {
      return formatCurrency(value)
    }
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  }
  return String(value)
}

function extractBestSellerItems(data: Record<string, unknown> | null | undefined) {
  if (!data) {
    return []
  }

  const candidates = [
    data.items,
    data.best_sellers,
    data.best_selling_products,
    data.products,
    data.results,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    }
  }

  return []
}

function downloadCsvFile(blob: BlobPart, filename: string) {
  const file = new Blob([blob], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [salesInsight, setSalesInsight] = useState<CopilotQueryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<SalesFormState>(initialForm)

  useEffect(() => {
    loadSales()
    loadProducts()
    loadSalesInsights()
  }, [])

  const loadSales = async () => {
    try {
      const response = await salesAPI.getAll()
      setSales(response.data)
    } catch (error) {
      console.error('Failed to load sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  const loadSalesInsights = async () => {
    try {
      const capabilityResponse = await copilotAPI.getCapabilities()
      setCapabilities(capabilityResponse.data)
      if (capabilityResponse.data.features.sales_insights) {
        const response = await copilotAPI.query('What are my best-selling products this week?')
        setSalesInsight(response.data)
      }
    } catch (error) {
      console.error('Failed to load sales insights:', error)
    }
  }

  const exportSalesCsv = async () => {
    try {
      const response = await salesAPI.exportCsv()
      downloadCsvFile(response.data, 'intelliflow-sales.csv')
    } catch (error) {
      console.error('Failed to export sales CSV:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await salesAPI.create({
        ...formData,
        product_id: parseInt(formData.product_id),
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        sale_date: new Date(formData.sale_date).toISOString(),
        customer_id: formData.customer_id || null,
        order_id: formData.order_id || null,
      })
      setShowForm(false)
      setFormData(initialForm)
      loadSales()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create sale')
    }
  }

  const getProductName = (productId: number) => {
    const product = products.find((item) => item.id === productId)
    return product?.name || `Product #${productId}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" />
      </div>
    )
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const bestSellerItems = extractBestSellerItems(salesInsight?.data)

  const handleProductCreated = async (product: Product) => {
    await loadProducts()
    setFormData((current) => ({
      ...current,
      product_id: String(product.id),
      unit_price: current.unit_price || String(product.price ?? ''),
    }))
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-7">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">
            Sales Insights
          </p>
          <h2 className="font-montserrat mt-4 text-[clamp(1.8rem,5vw,2.6rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white text-balance">
            Performance context for the commercial ledger.
          </h2>
          <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Free workspaces can record sales. Pro and Boost unlock AI-ranked best sellers, velocity change detection, and anomaly visibility.
          </p>
        </div>

        <div className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6">
          {capabilities?.features.sales_insights ? (
            <>
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">This week&apos;s best sellers</p>
              {salesInsight?.answer && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/82">
                  {salesInsight.answer}
                </div>
              )}
              {bestSellerItems.length > 0 ? (
                <div className="mt-4 grid min-w-0 gap-3">
                  {bestSellerItems.map((item, index) => {
                    const entries = Object.entries(item)
                    const nameEntry =
                      entries.find(([key]) => ['product_name', 'name', 'title', 'sku'].includes(key)) ??
                      entries[0]

                    const detailEntries = entries.filter(([key]) => key !== nameEntry?.[0])

                    return (
                      <div key={`${String(nameEntry?.[1] ?? 'item')}-${index}`} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="font-montserrat text-sm font-semibold text-white break-words">
                          {String(nameEntry?.[1] ?? `Product ${index + 1}`)}
                        </p>
                        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                          {detailEntries.map(([key, value]) => (
                            <div key={key} className="min-w-0 rounded-xl bg-white/[0.04] px-3 py-3">
                              <p className="font-montserrat text-[10px] uppercase tracking-[0.14em] text-white/38">
                                {toDisplayLabel(key)}
                              </p>
                              <p className="mt-2 break-words text-sm leading-7 text-white/82">
                                {formatInsightValue(key, value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <StructuredDataPanel data={salesInsight?.data ?? {}} emptyMessage="No sales insight items available." />
                </div>
              )}
            </>
          ) : (
            <PlanAccessNotice
              requiredPlan="PREMIUM"
              title="Sales insights are available on Premium."
              body="Backend-enforced MCP sales analytics stay locked on Free, even if the frontend route is accessible."
            />
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm sm:rounded-[2rem] sm:p-7">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
            Sales
          </p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white text-balance">
            Commercial movement across your product catalogue.
          </h1>
          <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Record transactions, monitor order value, and keep a clean operating ledger for revenue performance.
          </p>
        </div>

        <div className="min-w-0 rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm sm:rounded-[2rem] sm:p-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            {[
              ['Revenue', formatCurrency(totalRevenue)],
              ['Transactions', sales.length.toString()],
              ['Products Sold', new Set(sales.map((sale) => sale.product_id)).size.toString()],
            ].map(([label, value]) => (
              <div key={label} className="app-surface-soft min-w-0 rounded-[1.4rem] p-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.14em] text-white/38">{label}</p>
                <p className="font-montserrat mt-3 text-[clamp(1.25rem,4vw,1.5rem)] font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="app-button-primary font-montserrat mt-5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
          >
            {showForm ? 'Close form' : 'Record sale'}
          </button>
          <button
            onClick={exportSalesCsv}
            className="font-montserrat mt-3 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/82"
          >
            Export sales CSV
          </button>
        </div>
      </section>

      {showForm && (
        <section className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[1.9rem] sm:p-6">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Record new sale</h2>
          <div className="mt-5">
            <QuickProductCreateForm onCreated={handleProductCreated} />
          </div>
          <form onSubmit={handleSubmit} className="mt-6 grid min-w-0 gap-5 md:grid-cols-2">
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Product</label>
              <select
                required
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Unit Price</label>
              <input
                type="number"
                step="0.01"
                required
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Sale Date</label>
              <input
                type="date"
                required
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Customer ID</label>
              <input
                type="text"
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Order ID</label>
              <input
                type="text"
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              />
            </div>
            <div className="min-w-0 md:col-span-2">
              <button
                type="submit"
                className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] sm:px-6"
              >
                Record sale
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="app-surface min-w-0 overflow-hidden rounded-[1.5rem] sm:rounded-[1.9rem]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Sales ledger</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[780px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Date</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Product</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Quantity</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Unit Price</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Total</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-5 font-lexend text-white/64">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <Link href={`/sales/${sale.id}`} className="font-montserrat font-semibold text-white hover:underline">
                      {getProductName(sale.product_id)}
                    </Link>
                  </td>
                  <td className="px-6 py-5 font-montserrat text-white">{sale.quantity}</td>
                  <td className="px-6 py-5 font-montserrat text-white">{formatCurrency(sale.unit_price)}</td>
                  <td className="px-6 py-5 font-montserrat text-white">{formatCurrency(sale.total_amount)}</td>
                  <td className="px-6 py-5 font-lexend text-white/64">{sale.order_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="px-6 py-12 text-center text-white/52">No sales recorded yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}
