'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import { productsAPI, purchasingAPI } from '@/lib/api'
import { normalizePlanLabel } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { Product } from '@/types/product'
import type { PurchaseOrder, Supplier } from '@/types/purchasing'

const initialForm = {
  supplier_id: '',
  product_id: '',
  warehouse_id: '',
  quantity_ordered: '10',
  unit_cost: '0',
  expected_arrival_date: '',
  notes: '',
}

export default function PurchasingPage() {
  const { user } = useAuth()
  const plan = normalizePlanLabel(user?.subscription_plan)
  const isLocked = plan === 'FREE'
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [ordersResponse, productsResponse, suppliersResponse] = await Promise.all([
        purchasingAPI.getAll(),
        productsAPI.getAll(),
        purchasingAPI.getSuppliers(),
      ])
      setOrders(ordersResponse.data)
      setProducts(productsResponse.data)
      setSuppliers(suppliersResponse.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load purchasing workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const metrics = useMemo(() => {
    const ordered = orders.filter((item) => item.status === 'ORDERED').length
    const receiving = orders.filter((item) => item.status === 'PARTIALLY_RECEIVED').length
    return {
      total: orders.length,
      ordered,
      receiving,
      draft: orders.filter((item) => item.status === 'DRAFT').length,
    }
  }, [orders])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await purchasingAPI.create({
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        expected_arrival_date: form.expected_arrival_date ? new Date(form.expected_arrival_date).toISOString() : null,
        notes: form.notes || null,
        items: [
          {
            product_id: Number(form.product_id),
            warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
            quantity_ordered: Number(form.quantity_ordered),
            unit_cost: Number(form.unit_cost),
          },
        ],
      })
      setForm(initialForm)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create purchase order.')
    } finally {
      setSubmitting(false)
    }
  }

  const markOrdered = async (orderId: number) => {
    try {
      await purchasingAPI.markOrdered(orderId)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark order as placed.')
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  if (isLocked) {
    return (
      <PlanAccessNotice
        requiredPlan="PREMIUM"
        title="Purchasing workflows are available on Premium."
        body="Persisted backend plan enforcement now protects purchase orders, receiving, reorder workflows, and inbound execution from Free-tier access."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Purchasing</p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            Supplier orders and inbound ledger intake.
          </h1>
          <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Create supplier purchase orders, track ordered versus partially received status, and keep inbound supply movement tied to the stock ledger.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Total POs', metrics.total],
            ['Ordered', metrics.ordered],
            ['Receiving', metrics.receiving],
            ['Draft', metrics.draft],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
              <p className="font-montserrat mt-3 text-3xl font-semibold text-white">{String(value)}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{String(error)}</div>}

      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <h2 className="font-montserrat text-2xl font-semibold text-white">Create purchase order</h2>
        <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Supplier</label>
            <select className="mt-2 w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none" value={form.supplier_id} onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))}>
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Product</label>
            <select required className="mt-2 w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none" value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}>
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Warehouse ID</label>
            <input className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.warehouse_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_id: event.target.value }))} />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Expected arrival</label>
            <input type="date" className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.expected_arrival_date} onChange={(event) => setForm((current) => ({ ...current, expected_arrival_date: event.target.value }))} />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Quantity ordered</label>
            <input required min="1" type="number" className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.quantity_ordered} onChange={(event) => setForm((current) => ({ ...current, quantity_ordered: event.target.value }))} />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Unit cost</label>
            <input required min="0" step="0.01" type="number" className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.unit_cost} onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Notes</label>
            <textarea rows={3} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={submitting} className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {submitting ? 'Creating...' : 'Create purchase order'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Purchase orders</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">PO</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Status</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Supplier</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Expected arrival</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Items</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-5 text-white">{order.po_number}</td>
                  <td className="px-6 py-5 text-white/72">{order.status}</td>
                  <td className="px-6 py-5 text-white/72">{order.supplier_id ? `Supplier #${order.supplier_id}` : 'Unassigned'}</td>
                  <td className="px-6 py-5 text-white/72">{order.expected_arrival_date ? new Date(order.expected_arrival_date).toLocaleDateString() : 'TBD'}</td>
                  <td className="px-6 py-5 text-white/72">{order.items.length}</td>
                  <td className="px-6 py-5">
                    {order.status === 'DRAFT' ? (
                      <button type="button" onClick={() => markOrdered(order.id)} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/76">
                        Mark ordered
                      </button>
                    ) : (
                      <span className="text-white/44">Tracked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
