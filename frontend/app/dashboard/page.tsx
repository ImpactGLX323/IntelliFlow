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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="-mx-4 min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-8 text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black px-6 py-8 shadow-[0_40px_90px_-70px_rgba(15,23,42,0.8)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/70">
                IntelliFlow Analytics
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">
                Welcome back {user?.email ? `· ${user.email}` : ''}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <span>Search</span>
              </div>
              <button className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100">
                Filter by date range
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Overview
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Last 30 days</p>
              </div>
              {['Products', 'Customers', 'Transactions', 'Settings'].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span>{item}</span>
                  <span className="text-xs text-slate-500">→</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
                <span>Dark Mode</span>
                <span className="h-4 w-8 rounded-full bg-emerald-400/60"></span>
              </div>
            </aside>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Total Revenue</span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-200">
                      +12%
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    ${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Last 30 days</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Total Transactions</span>
                    <span className="rounded-full bg-blue-400/10 px-2 py-1 text-blue-200">
                      +5%
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {stats.total_orders.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Last 30 days</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Total Products</span>
                    <span className="rounded-full bg-purple-400/10 px-2 py-1 text-purple-200">
                      +2%
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {stats.total_products.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Inventory</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Low Stock Alerts</span>
                    <span className="rounded-full bg-rose-400/10 px-2 py-1 text-rose-200">
                      Action
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {stats.low_stock_alerts.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Needs attention</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Customer Growth</h2>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      View details
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_120px]">
                    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
                      <div className="text-xs text-slate-400">Global Presence</div>
                      <div className="mt-3 h-40 w-full rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent)]">
                        <svg
                          viewBox="0 0 240 120"
                          className="h-full w-full text-blue-200/60"
                          fill="currentColor"
                        >
                          <path d="M18 72l24-10 18 8 18-6 20 12 24-8 20 6 24-10 28 12 18-6 10 10-20 8-18 6-20-4-20 6-24-4-16 4-20-6-18 6-20-4-18 8z" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Asia', value: '48%' },
                        { label: 'Europe', value: '32%' },
                        { label: 'US', value: '20%' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3 text-xs text-slate-300"
                        >
                          <p className="text-slate-500">{item.label}</p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Revenue Growth</h2>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      Last 7 days
                    </button>
                  </div>
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.recent_trends}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.2)',
                            borderRadius: 12,
                            color: '#e2e8f0',
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#38bdf8' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Orders Overview</h2>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      Last 7 days
                    </button>
                  </div>
                  <div className="mt-4 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.recent_trends}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.2)',
                            borderRadius: 12,
                            color: '#e2e8f0',
                          }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Bar dataKey="order_count" fill="#34d399" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Top Sellers</h2>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      30 days
                    </button>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                    <table className="min-w-full divide-y divide-white/5 text-xs">
                      <thead className="bg-white/5">
                        <tr className="text-left text-slate-400">
                          <th className="px-4 py-3 font-medium uppercase tracking-wide">
                            Product
                          </th>
                          <th className="px-4 py-3 font-medium uppercase tracking-wide">
                            Qty
                          </th>
                          <th className="px-4 py-3 font-medium uppercase tracking-wide">
                            Revenue
                          </th>
                          <th className="px-4 py-3 font-medium uppercase tracking-wide">
                            Orders
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {stats.top_sellers.map((seller) => (
                          <tr key={seller.product_id} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-medium text-white">
                              {seller.product_name}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {seller.total_quantity}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              ${seller.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {seller.total_sales}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
