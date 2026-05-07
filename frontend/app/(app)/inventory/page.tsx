'use client'

import { useEffect, useMemo, useState } from 'react'
import QuickProductCreateForm from '@/components/ui/QuickProductCreateForm'
import RecommendationCard from '@/components/ui/RecommendationCard'
import { analyticsAPI, copilotAPI, inventoryAPI, productsAPI, purchasingAPI } from '@/lib/api'
import type { InventoryRisk } from '@/types/analytics'
import type { AgentRecommendation } from '@/types/copilot'
import type { InventoryTransaction, Warehouse } from '@/types/inventory'
import type { Supplier } from '@/types/purchasing'
import type { Product } from '@/types/product'

const receiveInitialForm = {
  product_id: '',
  warehouse_id: '',
  quantity: '10',
  reference_id: '',
}

const adjustmentInitialForm = {
  product_id: '',
  warehouse_id: '',
  quantity: '1',
  adjustment_type: 'POSITIVE',
  reason: '',
  notes: '',
}

const supplierInitialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  lead_time_days: '',
}

const warehouseInitialForm = {
  name: '',
  code: '',
  address: '',
  is_active: true,
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

export default function InventoryPage() {
  const [risks, setRisks] = useState<InventoryRisk[]>([])
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sheetSaving, setSheetSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [receiveForm, setReceiveForm] = useState(receiveInitialForm)
  const [adjustmentForm, setAdjustmentForm] = useState(adjustmentInitialForm)
  const [supplierForm, setSupplierForm] = useState(supplierInitialForm)
  const [warehouseForm, setWarehouseForm] = useState(warehouseInitialForm)
  const [csvInputs, setCsvInputs] = useState({ products: '', suppliers: '', warehouses: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const [riskResponse, recommendationResponse, transactionResponse, warehouseResponse, productResponse, supplierResponse] = await Promise.all([
          analyticsAPI.getInventoryRisks(),
          copilotAPI.getRecommendations({ domain: 'inventory', limit: 6 }),
          inventoryAPI.getTransactions({ limit: 12 }),
          inventoryAPI.getWarehouses(),
          productsAPI.getAll(),
          purchasingAPI.getSuppliers(),
        ])
        setRisks(riskResponse.data)
        setRecommendations(recommendationResponse.data)
        setTransactions(transactionResponse.data)
        setWarehouses(warehouseResponse.data)
        setProducts(productResponse.data)
        setSuppliers(supplierResponse.data)
        const fallbackWarehouse = warehouseResponse.data[0]?.id ? String(warehouseResponse.data[0].id) : ''
        setReceiveForm((current) => ({ ...current, warehouse_id: current.warehouse_id || fallbackWarehouse }))
        setAdjustmentForm((current) => ({ ...current, warehouse_id: current.warehouse_id || fallbackWarehouse }))
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load inventory workspace.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const reloadWorkspace = async () => {
    const [riskResponse, recommendationResponse, transactionResponse, warehouseResponse, productResponse, supplierResponse] = await Promise.all([
      analyticsAPI.getInventoryRisks(),
      copilotAPI.getRecommendations({ domain: 'inventory', limit: 6 }),
      inventoryAPI.getTransactions({ limit: 12 }),
      inventoryAPI.getWarehouses(),
      productsAPI.getAll(),
      purchasingAPI.getSuppliers(),
    ])
    setRisks(riskResponse.data)
    setRecommendations(recommendationResponse.data)
    setTransactions(transactionResponse.data)
    setWarehouses(warehouseResponse.data)
    setProducts(productResponse.data)
    setSuppliers(supplierResponse.data)
  }

  const productWarehouseMap = useMemo(() => {
    const next = new Map<number, string[]>()
    transactions.forEach((transaction) => {
      const warehouseName = warehouses.find((warehouse) => warehouse.id === transaction.warehouse_id)?.name
      if (!warehouseName) return
      const current = next.get(transaction.product_id) ?? []
      if (!current.includes(warehouseName)) current.push(warehouseName)
      next.set(transaction.product_id, current)
    })
    return next
  }, [transactions, warehouses])

  const supplierProductsMap = useMemo(() => {
    const next = new Map<string, Product[]>()
    products.forEach((product) => {
      if (!product.supplier) return
      const current = next.get(product.supplier) ?? []
      current.push(product)
      next.set(product.supplier, current)
    })
    return next
  }, [products])

  const warehouseProductsMap = useMemo(() => {
    const next = new Map<number, Product[]>()
    transactions.forEach((transaction) => {
      const product = products.find((item) => item.id === transaction.product_id)
      if (!product) return
      const current = next.get(transaction.warehouse_id) ?? []
      if (!current.some((item) => item.id === product.id)) current.push(product)
      next.set(transaction.warehouse_id, current)
    })
    return next
  }, [transactions, products])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  const criticalCount = risks.filter((item) => item.risk_level === 'critical').length
  const averageDaysOfStock = risks.length
    ? risks.reduce((sum, item) => sum + (item.days_of_stock ?? 0), 0) / risks.length
    : 0

  const handleReceive = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await inventoryAPI.receive({
        product_id: Number(receiveForm.product_id),
        warehouse_id: Number(receiveForm.warehouse_id),
        quantity: Number(receiveForm.quantity),
        reference_id: receiveForm.reference_id || null,
      })
      setReceiveForm((current) => ({
        ...receiveInitialForm,
        warehouse_id: current.warehouse_id,
      }))
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to receive stock.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdjustment = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await inventoryAPI.adjust({
        product_id: Number(adjustmentForm.product_id),
        warehouse_id: Number(adjustmentForm.warehouse_id),
        quantity: Number(adjustmentForm.quantity),
        adjustment_type: adjustmentForm.adjustment_type,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes || null,
      })
      setAdjustmentForm((current) => ({
        ...adjustmentInitialForm,
        warehouse_id: current.warehouse_id,
      }))
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post stock adjustment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSupplier = async (event: React.FormEvent) => {
    event.preventDefault()
    setSheetSaving('supplier-create')
    setError('')
    try {
      await purchasingAPI.createSupplier({
        ...supplierForm,
        lead_time_days: supplierForm.lead_time_days ? Number(supplierForm.lead_time_days) : null,
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        address: supplierForm.address || null,
      })
      setSupplierForm(supplierInitialForm)
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create supplier.')
    } finally {
      setSheetSaving(null)
    }
  }

  const handleCreateWarehouse = async (event: React.FormEvent) => {
    event.preventDefault()
    setSheetSaving('warehouse-create')
    setError('')
    try {
      await inventoryAPI.createWarehouse({
        ...warehouseForm,
        address: warehouseForm.address || null,
      })
      setWarehouseForm(warehouseInitialForm)
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create warehouse.')
    } finally {
      setSheetSaving(null)
    }
  }

  const handleSaveSupplier = async (supplier: Supplier) => {
    setSheetSaving(`supplier-${supplier.id}`)
    setError('')
    try {
      await purchasingAPI.updateSupplier(supplier.id, {
        name: supplier.name,
        email: supplier.email || null,
        phone: supplier.phone || null,
        address: supplier.address || null,
        lead_time_days: supplier.lead_time_days ?? null,
      })
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update supplier.')
    } finally {
      setSheetSaving(null)
    }
  }

  const handleSaveWarehouse = async (warehouse: Warehouse) => {
    setSheetSaving(`warehouse-${warehouse.id}`)
    setError('')
    try {
      await inventoryAPI.updateWarehouse(warehouse.id, {
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || null,
        is_active: warehouse.is_active,
      })
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update warehouse.')
    } finally {
      setSheetSaving(null)
    }
  }

  const handleSaveProductRouting = async (product: Product) => {
    setSheetSaving(`product-${product.id}`)
    setError('')
    try {
      await productsAPI.update(product.id, {
        supplier: product.supplier || null,
      })
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update product supplier mapping.')
    } finally {
      setSheetSaving(null)
    }
  }

  const handleCsvFile = (entity: 'products' | 'suppliers' | 'warehouses', file?: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvInputs((current) => ({ ...current, [entity]: String(reader.result || '') }))
    }
    reader.readAsText(file)
  }

  const handleImportCsv = async (entity: 'products' | 'suppliers' | 'warehouses') => {
    const csvText = csvInputs[entity].trim()
    if (!csvText) {
      setError(`Paste ${entity} CSV content before importing.`)
      return
    }
    setSheetSaving(`${entity}-csv`)
    setError('')
    try {
      if (entity === 'products') {
        await productsAPI.importCsv(csvText)
      } else if (entity === 'suppliers') {
        await purchasingAPI.importSuppliersCsv(csvText)
      } else {
        await inventoryAPI.importWarehousesCsv(csvText)
      }
      setCsvInputs((current) => ({ ...current, [entity]: '' }))
      await reloadWorkspace()
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to import ${entity} CSV.`)
    } finally {
      setSheetSaving(null)
    }
  }

  const handleExportProductsCsv = async () => {
    try {
      const response = await productsAPI.exportCsv()
      downloadCsvFile(response.data, 'intelliflow-products.csv')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export products CSV.')
    }
  }

  const handleExportSuppliersCsv = async () => {
    try {
      const response = await purchasingAPI.exportSuppliersCsv()
      downloadCsvFile(response.data, 'intelliflow-suppliers.csv')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export suppliers CSV.')
    }
  }

  const handleExportWarehousesCsv = async () => {
    try {
      const response = await inventoryAPI.exportWarehousesCsv()
      downloadCsvFile(response.data, 'intelliflow-warehouses.csv')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export warehouses CSV.')
    }
  }

  const handleProductCreated = async (product: Product) => {
    await reloadWorkspace()
    setReceiveForm((current) => ({ ...current, product_id: String(product.id) }))
    setAdjustmentForm((current) => ({ ...current, product_id: String(product.id) }))
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Inventory Insights</p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            Ledger-first stock visibility.
          </h1>
          <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Free users get basic inventory visibility. Recommendations below are generated from MCP-backed inventory scans and analytics.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Tracked risks', risks.length.toString()],
            ['Critical items', criticalCount.toString()],
            ['Avg days of stock', averageDaysOfStock ? averageDaysOfStock.toFixed(1) : '0'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
              <p className="font-montserrat mt-3 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="app-surface min-w-0 rounded-[1.7rem] p-6">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Receive stock</p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">Add products into inventory</h2>
          <div className="mt-5">
            <QuickProductCreateForm onCreated={handleProductCreated} />
          </div>
          <form onSubmit={handleReceive} className="mt-5 grid gap-4">
            <select
              required
              className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
              value={receiveForm.product_id}
              onChange={(event) => setReceiveForm((current) => ({ ...current, product_id: event.target.value }))}
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <select
              required
              className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
              value={receiveForm.warehouse_id}
              onChange={(event) => setReceiveForm((current) => ({ ...current, warehouse_id: event.target.value }))}
            >
              <option value="">Select a warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
            <input
              required
              min="1"
              type="number"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={receiveForm.quantity}
              onChange={(event) => setReceiveForm((current) => ({ ...current, quantity: event.target.value }))}
              placeholder="Quantity received"
            />
            <input
              type="text"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={receiveForm.reference_id}
              onChange={(event) => setReceiveForm((current) => ({ ...current, reference_id: event.target.value }))}
              placeholder="PO or receipt reference"
            />
            <button type="submit" disabled={submitting} className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {submitting ? 'Posting...' : 'Receive stock'}
            </button>
          </form>
        </div>

        <div className="app-surface min-w-0 rounded-[1.7rem] p-6">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Stock adjustment</p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">Correct the ledger safely</h2>
          <form onSubmit={handleAdjustment} className="mt-5 grid gap-4">
            <select
              required
              className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
              value={adjustmentForm.product_id}
              onChange={(event) => setAdjustmentForm((current) => ({ ...current, product_id: event.target.value }))}
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                required
                className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
                value={adjustmentForm.warehouse_id}
                onChange={(event) => setAdjustmentForm((current) => ({ ...current, warehouse_id: event.target.value }))}
              >
                <option value="">Select a warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
                value={adjustmentForm.adjustment_type}
                onChange={(event) => setAdjustmentForm((current) => ({ ...current, adjustment_type: event.target.value }))}
              >
                <option value="POSITIVE">Positive adjustment</option>
                <option value="NEGATIVE">Negative adjustment</option>
              </select>
            </div>
            <input
              required
              min="1"
              type="number"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={adjustmentForm.quantity}
              onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))}
              placeholder="Quantity"
            />
            <input
              required
              type="text"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={adjustmentForm.reason}
              onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Reason for adjustment"
            />
            <textarea
              rows={3}
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              value={adjustmentForm.notes}
              onChange={(event) => setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Notes"
            />
            <button type="submit" disabled={submitting} className="app-button-secondary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {submitting ? 'Posting...' : 'Post adjustment'}
            </button>
          </form>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-3">
        {[
          {
            key: 'products' as const,
            title: 'Products CSV',
            subtitle: 'Round-trip SKU rows, supplier assignments, and opening stock safely through the ledger.',
            exportAction: handleExportProductsCsv,
          },
          {
            key: 'suppliers' as const,
            title: 'Suppliers CSV',
            subtitle: 'Manage supplier records and lead-time fields in bulk.',
            exportAction: handleExportSuppliersCsv,
          },
          {
            key: 'warehouses' as const,
            title: 'Warehouses CSV',
            subtitle: 'Bulk maintain warehouse names, codes, addresses, and active status.',
            exportAction: handleExportWarehousesCsv,
          },
        ].map((item) => (
          <div key={item.key} className="app-surface min-w-0 rounded-[1.7rem] p-6">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">{item.title}</p>
            <p className="font-lexend mt-3 text-sm leading-7 text-white/68">{item.subtitle}</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-4 block w-full text-xs text-white/62 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
              onChange={(event) => handleCsvFile(item.key, event.target.files?.[0])}
            />
            <textarea
              rows={10}
              className="font-lexend mt-4 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/24"
              placeholder={`Paste ${item.key} CSV here`}
              value={csvInputs[item.key]}
              onChange={(event) => setCsvInputs((current) => ({ ...current, [item.key]: event.target.value }))}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={item.exportAction}
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/82"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => handleImportCsv(item.key)}
                disabled={sheetSaving === `${item.key}-csv`}
                className="app-button-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                {sheetSaving === `${item.key}-csv` ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-[#ff9b3d]/75">IntelliFlow sheet</p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">Supplier, warehouse, and product mapping</h2>
          <p className="font-lexend mt-3 max-w-3xl text-sm leading-7 text-white/62">
            Manually input supplier and warehouse details, then keep associated products visible in one ledger-linked spreadsheet surface that MCP and RAG workflows can reason about later.
          </p>
        </div>
        <div className="grid gap-6 p-6 xl:grid-cols-2">
          <form onSubmit={handleCreateSupplier} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">New supplier row</p>
            <div className="mt-4 grid gap-3">
              <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Supplier name" value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Email" value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Phone" value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Address" value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" type="number" min="0" placeholder="Lead days" value={supplierForm.lead_time_days} onChange={(event) => setSupplierForm((current) => ({ ...current, lead_time_days: event.target.value }))} />
              </div>
              <button type="submit" disabled={sheetSaving === 'supplier-create'} className="app-button-secondary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
                {sheetSaving === 'supplier-create' ? 'Saving row...' : 'Add supplier row'}
              </button>
            </div>
          </form>

          <form onSubmit={handleCreateWarehouse} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">New warehouse row</p>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Warehouse name" value={warehouseForm.name} onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))} required />
                <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Code" value={warehouseForm.code} onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value }))} required />
              </div>
              <input className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" placeholder="Address" value={warehouseForm.address} onChange={(event) => setWarehouseForm((current) => ({ ...current, address: event.target.value }))} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                <input type="checkbox" checked={warehouseForm.is_active} onChange={(event) => setWarehouseForm((current) => ({ ...current, is_active: event.target.checked }))} />
                Warehouse is active for intake and transfers
              </label>
              <button type="submit" disabled={sheetSaving === 'warehouse-create'} className="app-button-secondary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
                {sheetSaving === 'warehouse-create' ? 'Saving row...' : 'Add warehouse row'}
              </button>
            </div>
          </form>
        </div>

        <div className="border-t border-white/10 px-6 py-5">
          <h3 className="font-montserrat text-xl font-semibold text-white">Supplier sheet</h3>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[1040px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                {['Supplier', 'Email', 'Phone', 'Lead days', 'Address', 'Associated products', 'Action'].map((label) => (
                  <th key={label} className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4">
                    <input className="w-44 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={supplier.name} onChange={(event) => setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, name: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-52 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={supplier.email ?? ''} onChange={(event) => setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, email: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-40 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={supplier.phone ?? ''} onChange={(event) => setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, phone: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-24 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" type="number" min="0" value={supplier.lead_time_days ?? ''} onChange={(event) => setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, lead_time_days: event.target.value ? Number(event.target.value) : null } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-64 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={supplier.address ?? ''} onChange={(event) => setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, address: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    <div className="flex max-w-[260px] flex-wrap gap-2">
                      {(supplierProductsMap.get(supplier.name) ?? []).map((product) => (
                        <span key={`${supplier.id}-${product.id}`} className="max-w-full break-all rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/76">
                          {product.name}
                        </span>
                      ))}
                      {!supplierProductsMap.get(supplier.name)?.length && <span className="text-xs text-white/38">No linked products yet</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => handleSaveSupplier(supplier)} disabled={sheetSaving === `supplier-${supplier.id}`} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/76">
                      {sheetSaving === `supplier-${supplier.id}` ? 'Saving' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {!suppliers.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-white/46">No suppliers yet. Add the first supplier row above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/10 px-6 py-5">
          <h3 className="font-montserrat text-xl font-semibold text-white">Warehouse sheet</h3>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[960px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                {['Warehouse', 'Code', 'Address', 'Status', 'Associated products', 'Action'].map((label) => (
                  <th key={label} className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td className="px-6 py-4">
                    <input className="w-52 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={warehouse.name} onChange={(event) => setWarehouses((current) => current.map((item) => item.id === warehouse.id ? { ...item, name: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-32 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={warehouse.code} onChange={(event) => setWarehouses((current) => current.map((item) => item.id === warehouse.id ? { ...item, code: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-72 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={warehouse.address ?? ''} onChange={(event) => setWarehouses((current) => current.map((item) => item.id === warehouse.id ? { ...item, address: event.target.value } : item))} />
                  </td>
                  <td className="px-6 py-4">
                    <label className="flex items-center gap-2 text-white/72">
                      <input type="checkbox" checked={warehouse.is_active} onChange={(event) => setWarehouses((current) => current.map((item) => item.id === warehouse.id ? { ...item, is_active: event.target.checked } : item))} />
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </label>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    <div className="flex max-w-[260px] flex-wrap gap-2">
                      {(warehouseProductsMap.get(warehouse.id) ?? []).map((product) => (
                        <span key={`${warehouse.id}-${product.id}`} className="max-w-full break-all rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/76">
                          {product.name}
                        </span>
                      ))}
                      {!warehouseProductsMap.get(warehouse.id)?.length && <span className="text-xs text-white/38">No tracked products yet</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => handleSaveWarehouse(warehouse)} disabled={sheetSaving === `warehouse-${warehouse.id}`} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/76">
                      {sheetSaving === `warehouse-${warehouse.id}` ? 'Saving' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/10 px-6 py-5">
          <h3 className="font-montserrat text-xl font-semibold text-white">Product routing sheet</h3>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                {['Product', 'SKU', 'Supplier', 'Tracked warehouses', 'Min threshold', 'Action'].map((label) => (
                  <th key={label} className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 text-white">{product.name}</td>
                  <td className="px-6 py-4 text-white/62">{product.sku}</td>
                  <td className="px-6 py-4">
                    <input className="w-52 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={product.supplier ?? ''} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, supplier: event.target.value } : item))} placeholder="Supplier name" />
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    <div className="flex max-w-[260px] flex-wrap gap-2">
                      {(productWarehouseMap.get(product.id) ?? []).map((warehouseName) => (
                        <span key={`${product.id}-${warehouseName}`} className="max-w-full break-all rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/76">
                          {warehouseName}
                        </span>
                      ))}
                      {!productWarehouseMap.get(product.id)?.length && <span className="text-xs text-white/38">No warehouse history yet</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/62">{product.min_stock_threshold}</td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => handleSaveProductRouting(product)} disabled={sheetSaving === `product-${product.id}`} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/76">
                      {sheetSaving === `product-${product.id}` ? 'Saving' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Stock risk board</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Product</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Available</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Minimum</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Days of stock</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {risks.map((risk) => (
                <tr key={risk.product_id}>
                  <td className="px-6 py-5 text-white">{risk.product_name}</td>
                  <td className="px-6 py-5 text-white/72">{risk.current_stock}</td>
                  <td className="px-6 py-5 text-white/72">{risk.min_threshold}</td>
                  <td className="px-6 py-5 text-white/72">{risk.days_of_stock?.toFixed(1) ?? 'N/A'}</td>
                  <td className="px-6 py-5"><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/76">{risk.risk_level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Recent stock movements</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Product</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Warehouse</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Type</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Qty</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Direction</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-5 text-white/76">{products.find((product) => product.id === transaction.product_id)?.name ?? `Product #${transaction.product_id}`}</td>
                  <td className="px-6 py-5 text-white/64">{warehouses.find((warehouse) => warehouse.id === transaction.warehouse_id)?.name ?? `Warehouse #${transaction.warehouse_id}`}</td>
                  <td className="px-6 py-5 text-white/64">{transaction.transaction_type.replaceAll('_', ' ')}</td>
                  <td className="px-6 py-5 text-white">{transaction.quantity}</td>
                  <td className="px-6 py-5 text-white/64">{transaction.direction}</td>
                  <td className="px-6 py-5 text-white/52">{transaction.reference_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="px-6 py-12 text-center text-white/52">No stock movement recorded yet.</div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-[#ff9b3d]/75">Agent Recommendations</p>
          <h2 className="font-montserrat mt-3 text-3xl font-semibold text-white">Inventory signals</h2>
        </div>
        <div className="grid gap-4">
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </section>
    </div>
  )
}
