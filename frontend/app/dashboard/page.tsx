'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { analyticsAPI } from '@/lib/api'
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

interface DashboardStats {
  total_revenue: number
  total_orders: number
  total_products: number
  low_stock_alerts: number
  top_sellers: Array<{
    product_id: number
    product_name: string
    total_quantity: number
    total_revenue: number
    total_sales: number
  }>
  recent_trends: Array<{
    date: string
    revenue: number
    quantity: number
    order_count: number
  }>
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08111d]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Layout>
        <div className="rounded-[1.8rem] border border-white/12 bg-white/[0.04] px-6 py-12 text-center text-white/58">
          No data available
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-7 backdrop-blur-sm">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
              Dashboard
            </p>
            <h1 className="font-montserrat mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              ASEAN commerce and inventory in one view.
            </h1>
            <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
              Track revenue, order volume, inventory coverage, and replenishment risk from a
              single control surface designed for regional operations.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Workspace', user?.email ?? 'Active'],
                ['Region', 'Malaysia / ASEAN'],
                ['Coverage', 'Last 30 days'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className="font-lexend mt-3 text-sm text-white/82">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Quick snapshot
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Revenue', `$${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Orders', stats.total_orders.toLocaleString()],
                ['Products', stats.total_products.toLocaleString()],
                ['Low stock', stats.low_stock_alerts.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className="font-montserrat mt-3 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Revenue',
              value: `$${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
            <div key={item.label} className="rounded-[1.7rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">{item.label}</p>
              <p className="font-montserrat mt-4 text-3xl font-semibold text-white">{item.value}</p>
              <p className="font-lexend mt-3 text-sm text-white/54">{item.meta}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[1.9rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
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

          <div className="rounded-[1.9rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Top Sellers</p>
            <div className="mt-5 space-y-3">
              {stats.top_sellers.slice(0, 5).map((seller) => (
                <div key={seller.product_id} className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-montserrat text-sm font-semibold text-white">{seller.product_name}</p>
                      <p className="font-lexend mt-2 text-xs text-white/48">
                        {seller.total_quantity} units • {seller.total_sales} orders
                      </p>
                    </div>
                    <p className="font-montserrat text-sm font-semibold text-white">
                      ${seller.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.9rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
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

          <div className="rounded-[1.9rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
            <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Regional Priorities</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ['Port transit monitoring', 'Live oversight for inbound shipment flow and route timing.'],
                ['E-commerce stock sync', 'Reduce overselling risk across Shopee, Lazada, and marketplace channels.'],
                ['Reorder decisions', 'Use order momentum and stock pressure to time replenishment.'],
                ['Compliance readiness', 'Prepare exports and invoicing data for regional reporting workflows.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-montserrat text-sm font-semibold text-white">{title}</p>
                  <p className="font-lexend mt-3 text-sm leading-7 text-white/58">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
