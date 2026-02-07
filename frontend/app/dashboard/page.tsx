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
      <div className="min-h-screen bg-[#062a2b] text-slate-100 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.16),_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(15,118,110,0.35),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.04)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-30" />
        </div>
        <div className="relative z-10 container mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl p-6">
            {/* Dashboard header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-teal-300/70">
                  IntelliFlow Analytics
                </p>
                <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-teal-200 to-sky-200 bg-clip-text text-transparent">
                  Dashboard Overview
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Welcome back {user?.email}
                </p>
              </div>
            </div>
            {/* Main dashboard grid */}
            <div className="mt-4 grid gap-6 lg:grid-cols-[240px_1fr]">
              {/* Sidebar */}
              <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 backdrop-blur-md p-5 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Overview
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Last 30 days</p>
                </div>
                {['Products', 'Customers', 'Transactions', 'Settings'].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md px-3 py-2"
                  >
                    <span>{item}</span>
                    <span className="text-xs text-slate-400">→</span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md px-3 py-2">
                  <span>Dark Mode</span>
                  <span className="h-4 w-8 rounded-full bg-teal-400/40"></span>
                </div>
              </aside>
              {/* Main dashboard content */}
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Total Revenue</span>
                      <span className="rounded-full bg-gradient-to-r from-teal-400/50 to-sky-400/30 px-2 py-1 text-teal-200 font-semibold">
                        +12%
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-100">
                      ${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Last 30 days</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Total Transactions</span>
                      <span className="rounded-full bg-gradient-to-r from-sky-400/40 to-teal-400/40 px-2 py-1 text-sky-200 font-semibold">
                        +5%
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-100">
                      {stats.total_orders.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Last 30 days</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Total Products</span>
                      <span className="rounded-full bg-gradient-to-r from-teal-400/40 to-emerald-400/40 px-2 py-1 text-emerald-200 font-semibold">
                        +2%
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-100">
                      {stats.total_products.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Inventory</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Low Stock Alerts</span>
                      <span className="rounded-full bg-gradient-to-r from-rose-400/40 to-orange-400/40 px-2 py-1 text-rose-200 font-semibold">
                        Action
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-100">
                      {stats.low_stock_alerts.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Needs attention</p>
                  </div>
                </div>
                {/* Charts row */}
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  {/* Customer Growth */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-100">Customer Growth</h2>
                      <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                        View details
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_120px]">
                      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-teal-500/10 to-sky-400/10 p-4">
                        <div className="text-xs text-slate-400">Global Presence</div>
                        <div className="mt-3 h-40 w-full rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.18),transparent)]">
                          <svg
                            viewBox="0 0 240 120"
                            className="h-full w-full text-teal-300/70"
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
                            className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md px-3 py-3 text-xs text-slate-400"
                          >
                            <p className="text-slate-400">{item.label}</p>
                            <p className="mt-2 text-lg font-semibold text-slate-100">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Revenue Growth */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-100">Revenue Growth</h2>
                      <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                        Last 7 days
                      </button>
                    </div>
                    <div className="mt-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.recent_trends}>
                          <CartesianGrid stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
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
                              backgroundColor: 'rgba(15,23,42,0.85)',
                              border: '1px solid rgba(148,163,184,0.2)',
                              borderRadius: 12,
                              color: '#e2e8f0',
                              backdropFilter: 'blur(10px)',
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#5eead4"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#5eead4' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                {/* Orders & Top Sellers */}
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  {/* Orders Overview */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-100">Orders Overview</h2>
                      <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                        Last 7 days
                      </button>
                    </div>
                    <div className="mt-4 h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.recent_trends}>
                          <CartesianGrid stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
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
                              backgroundColor: 'rgba(15,23,42,0.85)',
                              border: '1px solid rgba(148,163,184,0.2)',
                              borderRadius: 12,
                              color: '#e2e8f0',
                              backdropFilter: 'blur(10px)',
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                          />
                          <Bar dataKey="order_count" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Top Sellers Table */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-100">Top Sellers</h2>
                      <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
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
                        <tbody className="divide-y divide-white/5 text-slate-100">
                          {stats.top_sellers.map((seller) => (
                            <tr key={seller.product_id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-100">
                                {seller.product_name}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                {seller.total_quantity}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                ${seller.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
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
      </div>
    </Layout>
  )
}
