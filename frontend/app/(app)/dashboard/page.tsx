'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import type { DashboardStats } from '@/types/analytics'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-[1.8rem] border border-white/12 bg-white/[0.04] px-6 py-12 text-center text-white/58">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="app-surface min-w-0 rounded-[2rem] p-6 sm:p-7">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
            Dashboard
          </p>
          <h1 className="text-balance font-montserrat mt-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-white">
            ASEAN commerce and inventory in one view.
          </h1>
          <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            Track revenue, order volume, inventory coverage, and replenishment risk from a
            single control surface designed for regional operations.
          </p>
          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-3">
            {[
              ['Workspace', user?.email ?? 'Active'],
              ['Region', 'Malaysia / ASEAN'],
              ['Coverage', 'Last 30 days'],
            ].map(([label, value]) => (
              <div key={label} className="app-surface-soft rounded-[1.4rem] p-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                <p className="font-lexend mt-3 text-sm text-white/82">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="app-surface min-w-0 rounded-[2rem] p-6">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
            Quick snapshot
          </p>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            {[
              ['Revenue', formatCurrency(stats.total_revenue)],
              ['Orders', stats.total_orders.toLocaleString()],
              ['Products', stats.total_products.toLocaleString()],
              ['Low stock', stats.low_stock_alerts.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="app-surface-soft rounded-[1.4rem] p-4">
                <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                <p className="font-montserrat mt-3 text-[clamp(1.35rem,4vw,1.5rem)] font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Revenue',
            value: formatCurrency(stats.total_revenue),
            meta: 'Trailing 30 days',
          },
          {
            label: 'Total Orders',
            value: stats.total_orders.toLocaleString(),
            meta: 'Commercial throughput',
          },
          {
            label: 'Products',
            value: stats.total_products.toLocaleString(),
            meta: 'Tracked catalogue',
          },
          {
            label: 'Low Stock Alerts',
            value: stats.low_stock_alerts.toLocaleString(),
            meta: 'Needs review',
          },
        ].map((item) => (
          <div key={item.label} className="app-surface min-w-0 rounded-[1.7rem] p-5">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{item.label}</p>
            <p className="font-montserrat mt-4 text-[clamp(1.65rem,4vw,1.875rem)] font-semibold text-white">{item.value}</p>
            <p className="font-lexend mt-3 text-sm text-white/54">{item.meta}</p>
          </div>
        ))}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Revenue Trend</p>
              <h2 className="font-montserrat mt-2 text-2xl font-semibold text-white">Commercial momentum</h2>
            </div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.recent_trends}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#90a4bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#90a4bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(8,17,29,0.94)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16,
                    color: '#ffffff',
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#d9e4f1" strokeWidth={2.5} dot={{ r: 3, fill: '#ffffff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Top Sellers</p>
          <div className="mt-5 space-y-3">
            {stats.top_sellers.slice(0, 5).map((seller) => (
              <div key={seller.product_id} className="app-surface-soft min-w-0 rounded-[1.3rem] px-4 py-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-montserrat text-sm font-semibold text-white">{seller.product_name}</p>
                    <p className="font-lexend mt-2 text-xs text-white/48">
                      {seller.total_quantity} units • {seller.total_sales} orders
                    </p>
                  </div>
                    <p className="shrink-0 font-montserrat text-sm font-semibold text-white">
                    {formatCurrency(seller.total_revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Operational Mix</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.recent_trends}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#90a4bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#90a4bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(8,17,29,0.94)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16,
                    color: '#ffffff',
                  }}
                />
                <Bar dataKey="order_count" fill="#ffffff" opacity={0.85} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Regional Priorities</p>
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
            {[
              ['Port transit monitoring', 'Live oversight for inbound shipment flow and route timing.'],
              ['E-commerce stock sync', 'Reduce overselling risk across Shopee, Lazada, and marketplace channels.'],
              ['Reorder decisions', 'Use order momentum and stock pressure to time replenishment.'],
              ['Compliance readiness', 'Prepare exports and invoicing data for regional reporting workflows.'],
            ].map(([title, body]) => (
              <div key={title} className="app-surface-soft rounded-[1.35rem] p-4">
                <p className="font-montserrat text-sm font-semibold text-white">{title}</p>
                <p className="font-lexend mt-3 text-sm leading-7 text-white/58">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
