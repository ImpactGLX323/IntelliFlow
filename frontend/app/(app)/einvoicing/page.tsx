'use client'

import { useEffect, useMemo, useState } from 'react'
import { einvoicingAPI, salesAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import type { EInvoiceDocument, EInvoiceSummary } from '@/types/einvoicing'
import type { Sale } from '@/types/sales'

const initialForm = {
  sale_id: '',
  buyer_name: '',
  buyer_email: '',
  buyer_tin: '',
}

function formatValidationNote(note: string) {
  return note.replaceAll('_', ' ')
}

export default function EInvoicingPage() {
  const [summary, setSummary] = useState<EInvoiceSummary | null>(null)
  const [documents, setDocuments] = useState<EInvoiceDocument[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryResponse, documentsResponse, salesResponse] = await Promise.all([
        einvoicingAPI.getSummary(),
        einvoicingAPI.getDocuments(),
        salesAPI.getAll({ limit: 50 }),
      ])
      setSummary(summaryResponse.data)
      setDocuments(documentsResponse.data)
      setSales(salesResponse.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load e-invoicing workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const uninvoicedSales = useMemo(() => {
    const used = new Set(documents.map((item) => item.sale_id))
    return sales.filter((sale) => !used.has(sale.id))
  }, [documents, sales])

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await einvoicingAPI.createFromSale(Number(form.sale_id), {
        buyer_name: form.buyer_name || null,
        buyer_email: form.buyer_email || null,
        buyer_tin: form.buyer_tin || null,
        invoice_type: '01',
      })
      setForm(initialForm)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate e-invoice document.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">E-Invoicing</p>
        <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
          LHDN-ready invoice preparation from recorded sales.
        </h1>
        <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          Generate structured invoice records from workspace sales, review tax identity gaps, and keep audit-friendly line-item payloads ready for a future MyInvois integration. This is readiness support, not a certification claim or live LHDN submission.
        </p>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Documents', String(summary?.total_documents ?? 0)],
          ['Ready', String(summary?.ready_documents ?? 0)],
          ['Missing tax identity', String(summary?.missing_tax_identity ?? 0)],
          ['Invoice value', formatCurrency(summary?.total_invoice_value ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="font-montserrat mt-3 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Generate from sale</h2>
          <form onSubmit={handleGenerate} className="mt-6 grid gap-4">
            <select
              required
              className="w-full rounded-2xl border border-white/12 bg-[#0e1828] px-4 py-3 text-sm text-white outline-none"
              value={form.sale_id}
              onChange={(event) => setForm((current) => ({ ...current, sale_id: event.target.value }))}
            >
              <option value="">Select a sale record</option>
              {uninvoicedSales.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  Sale #{sale.id} • {formatCurrency(sale.total_amount)} • {new Date(sale.sale_date).toLocaleDateString()}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              placeholder="Buyer name"
              value={form.buyer_name}
              onChange={(event) => setForm((current) => ({ ...current, buyer_name: event.target.value }))}
            />
            <input
              type="email"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              placeholder="Buyer email"
              value={form.buyer_email}
              onChange={(event) => setForm((current) => ({ ...current, buyer_email: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
              placeholder="Buyer TIN"
              value={form.buyer_tin}
              onChange={(event) => setForm((current) => ({ ...current, buyer_tin: event.target.value }))}
            />
            <button type="submit" disabled={submitting} className="app-button-primary font-montserrat px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
              {submitting ? 'Generating...' : 'Generate e-invoice'}
            </button>
          </form>
        </div>

        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Readiness checks</p>
          <div className="mt-4 grid gap-3">
            {[
              'Structured MYR totals derived from recorded sales.',
              'Line items carried from the actual product and sale record.',
              'Validation notes flag missing buyer or seller tax identity before any future submission.',
              'No official MyInvois transmission is claimed in this workspace yet.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/76">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] backdrop-blur-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Generated documents</h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/42">
              <tr>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Document</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Sale</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Buyer</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Validation</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Total</th>
                <th className="px-6 py-4 font-montserrat text-[11px] uppercase tracking-[0.18em]">Issue date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-6 py-5">
                    <p className="font-montserrat font-semibold text-white">{document.document_number}</p>
                    <p className="mt-1 text-xs text-white/44">{document.invoice_type} • {document.currency}</p>
                  </td>
                  <td className="px-6 py-5 text-white/72">Sale #{document.sale_id}</td>
                  <td className="px-6 py-5 text-white/72">
                    <p>{document.buyer_name || 'Not provided'}</p>
                    <p className="mt-1 text-xs text-white/44">{document.buyer_tin || 'TIN missing'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/76">
                      {document.validation_status.replaceAll('_', ' ')}
                    </span>
                    {document.validation_notes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {document.validation_notes.map((note) => (
                          <span key={note} className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100">
                            {formatValidationNote(note)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 font-montserrat text-white">{formatCurrency(document.total_amount)}</td>
                  <td className="px-6 py-5 text-white/72">{new Date(document.issue_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && (
            <div className="px-6 py-12 text-center text-white/52">
              No e-invoice documents yet. Generate the first one from an existing sale record.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
