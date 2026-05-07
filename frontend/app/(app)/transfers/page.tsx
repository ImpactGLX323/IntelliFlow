'use client'

import { useEffect, useMemo, useState } from 'react'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import { productsAPI, transfersAPI } from '@/lib/api'
import { normalizePlanLabel } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { Product } from '@/types/product'

interface Warehouse {
  id: number
  name: string
  code: string
  address: string | null
  is_active: boolean
}

interface InventoryTransaction {
  id: number
  product_id: number
  warehouse_id: number
  transaction_type: string
  quantity: number
  direction: string
  created_at: string
}

const initialForm = {
  product_id: '',
  from_warehouse_id: '',
  to_warehouse_id: '',
  quantity: '1',
  notes: '',
}

export default function TransfersPage() {
  const { user } = useAuth()
  const plan = normalizePlanLabel(user?.subscription_plan)
  const isLocked = plan === 'FREE'
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [warehouseResponse, productResponse, transactionResponse] = await Promise.all([
        transfersAPI.getWarehouses(),
        productsAPI.getAll(),
        transfersAPI.getTransactions({ transaction_type: 'TRANSFER_OUT' }),
      ])
      setWarehouses(warehouseResponse.data)
      setProducts(productResponse.data)
      setTransactions(transactionResponse.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load transfer workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const metrics = useMemo(() => ({
    warehouses: warehouses.length,
    active: warehouses.filter((warehouse) => warehouse.is_active).length,
    transfers: transactions.length,
    movedUnits: transactions.reduce((sum, item) => sum + Math.abs(item.quantity), 0),
  }), [transactions, warehouses])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await transfersAPI.createTransfer({
        product_id: Number(form.product_id),
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        quantity: Number(form.quantity),
        notes: form.notes || null,
      })
      setForm(initialForm)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create stock transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  if (isLocked) {
    return (
      <PlanAccessNotice
        requiredPlan="PREMIUM"
        title="Warehouse transfers are available on Premium."
        body="Free workspaces can inspect stock position, but warehouse-to-warehouse movement and multi-location workflows require Premium or Boost."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Transfers</p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            Stock movement between active locations.
          </h1>
          <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            This workspace uses the stock ledger transfer route directly, so movement is recorded as operational inventory truth instead of local UI state.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Warehouses', metrics.warehouses],
            ['Active locations', metrics.active],
            ['Transfers posted', metrics.transfers],
            ['Units moved', metrics.movedUnits],
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
        <h2 className="font-montserrat text-2xl font-semibold text-white">Create transfer</h2>
        <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
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
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Quantity</label>
            <input required min="1" type="number" className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">From warehouse</label>
            <select required className="mt-2 w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none" value={form.from_warehouse_id} onChange={(event) => setForm((current) => ({ ...current, from_warehouse_id: event.target.value }))}>
              <option value="">Select source</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">To warehouse</label>
            <select required className="mt-2 w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none" value={form.to_warehouse_id} onChange={(event) => setForm((current) => ({ ...current, to_warehouse_id: event.target.value }))}>
              <option value="">Select destination</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.12em] text-white/46">Notes</label>
            <textarea rows={3} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={submitting} className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {submitting ? 'Transferring...' : 'Create transfer'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-montserrat text-lg font-semibold text-white">{warehouse.name}</p>
                <p className="font-lexend mt-2 text-sm text-white/58">{warehouse.code} • {warehouse.address || 'No address'}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/76">
                {warehouse.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Recent transfer movements</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Product</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Warehouse</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Qty</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Direction</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-5 text-white">Product #{item.product_id}</td>
                  <td className="px-6 py-5 text-white/72">Warehouse #{item.warehouse_id}</td>
                  <td className="px-6 py-5 text-white/72">{item.quantity}</td>
                  <td className="px-6 py-5 text-white/72">{item.direction}</td>
                  <td className="px-6 py-5 text-white/72">{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
