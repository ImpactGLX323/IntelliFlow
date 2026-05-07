'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { productsAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import type { Product } from '@/types/product'

const initialForm = {
  name: '',
  sku: '',
  description: '',
  category: '',
  price: '',
  cost: '',
  current_stock: '',
  min_stock_threshold: '10',
  supplier: '',
}

const productFields: Array<{
  label: string
  key: keyof typeof initialForm
  type: string
  required: boolean
  step?: string
}> = [
  { label: 'Name', key: 'name', type: 'text', required: true },
  { label: 'SKU', key: 'sku', type: 'text', required: true },
  { label: 'Category', key: 'category', type: 'text', required: false },
  { label: 'Supplier', key: 'supplier', type: 'text', required: false },
  { label: 'Price', key: 'price', type: 'number', required: true, step: '0.01' },
  { label: 'Cost', key: 'cost', type: 'number', required: true, step: '0.01' },
  { label: 'Opening Stock', key: 'current_stock', type: 'number', required: true },
  { label: 'Min Stock Threshold', key: 'min_stock_threshold', type: 'number', required: false },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await productsAPI.create({
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        current_stock: parseInt(formData.current_stock),
        min_stock_threshold: parseInt(formData.min_stock_threshold),
        description: formData.description || null,
        category: formData.category || null,
        supplier: formData.supplier || null,
      })
      setShowForm(false)
      setFormData(initialForm)
      loadProducts()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create product')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" />
      </div>
    )
  }

  const lowStockCount = products.filter((product) => product.available_stock <= product.min_stock_threshold).length

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-7">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
            Products
          </p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white text-balance">
            Catalogue control for regional inventory.
          </h1>
          <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Manage product records, stock thresholds, pricing, and supplier context in one clean workspace.
          </p>
        </div>

        <div className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            {[
              ['Products', products.length.toString()],
              ['Low stock', lowStockCount.toString()],
              ['Suppliers', new Set(products.map((product) => product.supplier).filter(Boolean)).size.toString()],
            ].map(([label, value]) => (
              <div key={label} className="app-surface-soft min-w-0 rounded-[1.4rem] p-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.14em] text-white/38">{label}</p>
                <p className="font-montserrat mt-3 text-[clamp(1.35rem,5vw,1.5rem)] font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="app-button-primary font-montserrat mt-5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
          >
            {showForm ? 'Close form' : 'Add product'}
          </button>
        </div>
      </section>

      {showForm && (
        <section className="app-surface min-w-0 rounded-[1.5rem] p-5 sm:rounded-[1.9rem] sm:p-6">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Add product</h2>
          <form onSubmit={handleSubmit} className="mt-6 grid min-w-0 gap-5 md:grid-cols-2">
            {productFields.map((field) => (
              <div key={field.key} className="min-w-0">
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  required={field.required}
                  step={field.step}
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="min-w-0 md:col-span-2">
              <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">
                Description
              </label>
              <textarea
                rows={4}
                className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="min-w-0 md:col-span-2">
              <button
                type="submit"
                className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] sm:px-6"
              >
                Create product
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="app-surface min-w-0 overflow-hidden rounded-[1.5rem] sm:rounded-[1.9rem]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Product registry</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[860px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Name</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">SKU</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Category</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Supplier</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Price</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Available</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">On hand</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Reserved</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-5">
                    <Link href={`/products/${product.id}`} className="font-montserrat font-semibold text-white hover:underline">
                      {product.name}
                    </Link>
                    {product.description && (
                      <p className="font-lexend mt-1 max-w-xs text-xs text-white/44">{product.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-5 font-lexend text-white/64">{product.sku}</td>
                  <td className="px-6 py-5 font-lexend text-white/64">{product.category || '-'}</td>
                  <td className="px-6 py-5 font-lexend text-white/64">{product.supplier || '-'}</td>
                  <td className="px-6 py-5 font-montserrat text-white">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-5 font-montserrat text-white">{product.available_stock}</td>
                  <td className="px-6 py-5 font-montserrat text-white/76">{product.on_hand}</td>
                  <td className="px-6 py-5 font-montserrat text-white/76">{product.reserved}</td>
                  <td className="px-6 py-5">
                    {product.available_stock <= product.min_stock_threshold ? (
                      <span className="font-montserrat inline-flex whitespace-nowrap rounded-full bg-red-500/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200">
                        Low stock
                      </span>
                    ) : (
                      <span className="font-montserrat inline-flex whitespace-nowrap rounded-full bg-emerald-500/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                        In stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="px-6 py-12 text-center text-white/52">No products yet. Add your first product.</div>
          )}
        </div>
      </section>
    </div>
  )
}
