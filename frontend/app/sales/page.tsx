'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { salesAPI, productsAPI } from '@/lib/api'

interface Sale {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  customer_id: string | null
  order_id: string | null
}

interface Product {
  id: number
  name: string
}

const initialForm = {
  product_id: '',
  quantity: '',
  unit_price: '',
  sale_date: new Date().toISOString().split('T')[0],
  customer_id: '',
  order_id: '',
}

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadSales()
      loadProducts()
    }
  }, [user])

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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08111d]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" />
      </div>
    )
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)

  return (
    <Layout>
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-7 backdrop-blur-sm">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
              Sales
            </p>
            <h1 className="font-montserrat mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Commercial movement across your product catalogue.
            </h1>
            <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
              Record transactions, monitor order value, and keep a clean operating ledger for revenue performance.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Revenue', `$${totalRevenue.toFixed(2)}`],
                ['Transactions', sales.length.toString()],
                ['Products Sold', new Set(sales.map((sale) => sale.product_id)).size.toString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className="font-montserrat mt-3 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="font-montserrat mt-5 rounded-full bg-[#0f223a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10"
            >
              {showForm ? 'Close form' : 'Record sale'}
            </button>
          </div>
        </section>

        {showForm && (
          <section className="rounded-[1.9rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <h2 className="font-montserrat text-2xl font-semibold text-white">Record new sale</h2>
            <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Product</label>
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
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Sale Date</label>
                <input
                  type="date"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </div>
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Customer ID</label>
                <input
                  type="text"
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                />
              </div>
              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">Order ID</label>
                <input
                  type="text"
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="font-montserrat rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10"
                >
                  Record sale
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-[1.9rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="font-montserrat text-2xl font-semibold text-white">Sales ledger</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
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
                    <td className="px-6 py-5 font-montserrat font-semibold text-white">
                      {getProductName(sale.product_id)}
                    </td>
                    <td className="px-6 py-5 font-montserrat text-white">{sale.quantity}</td>
                    <td className="px-6 py-5 font-montserrat text-white">${sale.unit_price.toFixed(2)}</td>
                    <td className="px-6 py-5 font-montserrat text-white">${sale.total_amount.toFixed(2)}</td>
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
    </Layout>
  )
}
