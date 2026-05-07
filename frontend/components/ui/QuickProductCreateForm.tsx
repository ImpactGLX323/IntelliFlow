'use client'

import { useState } from 'react'
import { productsAPI } from '@/lib/api'
import type { Product } from '@/types/product'

interface QuickProductCreateFormProps {
  onCreated: (product: Product) => void | Promise<void>
  className?: string
}

const initialForm = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  price: '',
  cost: '',
  current_stock: '0',
  min_stock_threshold: '10',
}

export default function QuickProductCreateForm({ onCreated, className = '' }: QuickProductCreateFormProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await productsAPI.create({
        name: form.name,
        sku: form.sku,
        category: form.category || null,
        supplier: form.supplier || null,
        price: Number(form.price),
        cost: Number(form.cost),
        current_stock: Number(form.current_stock || 0),
        min_stock_threshold: Number(form.min_stock_threshold || 0),
        description: null,
      })
      setForm(initialForm)
      setOpen(false)
      await onCreated(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-[1.4rem] border border-white/12 bg-white/[0.03] p-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/38">Product options</p>
          <p className="font-lexend mt-2 text-sm leading-6 text-white/68">
            Add a new product here if your selector only shows older records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/82"
        >
          {open ? 'Close product form' : 'Quick add product'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Name</label>
            <input
              required
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">SKU</label>
            <input
              required
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.sku}
              onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Category</label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Supplier</label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.supplier}
              onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Price</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Cost</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.cost}
              onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Opening stock</label>
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.current_stock}
              onChange={(event) => setForm((current) => ({ ...current, current_stock: event.target.value }))}
            />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Min stock threshold</label>
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={form.min_stock_threshold}
              onChange={(event) => setForm((current) => ({ ...current, min_stock_threshold: event.target.value }))}
            />
          </div>
          {error && (
            <div className="md:col-span-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]"
            >
              {saving ? 'Creating...' : 'Create product and refresh options'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
