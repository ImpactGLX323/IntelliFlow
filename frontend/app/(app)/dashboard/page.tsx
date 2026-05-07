'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsAPI, integrationsAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import type { DashboardStats } from '@/types/analytics'
import type { BnmRatesResponse, DemandSignalItem, IntegrationProvider, IntegrationStatus, PortRiskItem, WarehouseDirectoryItem } from '@/types/integrations'
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

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatFixed(value: unknown, digits: number) {
  const numeric = asNumber(value)
  return numeric === null ? null : numeric.toFixed(digits)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [providers, setProviders] = useState<IntegrationProvider[]>([])
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [warehousePreview, setWarehousePreview] = useState<WarehouseDirectoryItem[]>([])
  const [portRisk, setPortRisk] = useState<PortRiskItem[]>([])
  const [demandSignals, setDemandSignals] = useState<DemandSignalItem[]>([])
  const [bnmRates, setBnmRates] = useState<BnmRatesResponse | null>(null)
  const [marketplaceStatus, setMarketplaceStatus] = useState<string>('locked')
  const [marketIntelligenceStatus, setMarketIntelligenceStatus] = useState<string>('locked')
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      const [
        dashboardResponse,
        registryResponse,
        statusResponse,
        warehousesResponse,
        portRiskResponse,
        demandSignalResponse,
        bnmRatesResponse,
      ] = await Promise.all([
        analyticsAPI.getDashboard(),
        integrationsAPI.getRegistry(),
        integrationsAPI.getStatus(),
        integrationsAPI.getWarehouses({ source: 'seeded', limit: 4 }),
        integrationsAPI.getPortRisk({ include_weather: true, include_marine: true }),
        integrationsAPI.getDemandSignals({ source: 'preview' }),
        integrationsAPI.getBnmRates({ currency: 'USD' }),
      ])
      setStats(dashboardResponse.data)
      setProviders(registryResponse.data.providers ?? [])
      setIntegrationStatus(statusResponse.data)
      setWarehousePreview(warehousesResponse.data.items ?? [])
      setPortRisk(portRiskResponse.data.ports ?? [])
      setDemandSignals(demandSignalResponse.data.items ?? [])
      setBnmRates(bnmRatesResponse.data)
      if (user?.subscription_plan && user.subscription_plan !== 'FREE') {
        try {
          const marketplaceResponse = await integrationsAPI.getMarketplaceProviders()
          setMarketplaceStatus(marketplaceResponse.data.providers?.some((item: any) => item.status !== 'not_configured') ? 'available' : 'not_configured')
        } catch {
          setMarketplaceStatus('not_configured')
        }
      }
      if (user?.subscription_plan === 'BOOST') {
        try {
          const marketWideResponse = await integrationsAPI.getMarketWideBestSellers()
          setMarketIntelligenceStatus(marketWideResponse.data.status || 'not_configured')
        } catch {
          setMarketIntelligenceStatus('not_configured')
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.subscription_plan])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

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

  const firstRate = bnmRates?.rates?.[0]
  const formattedBnmRate = formatFixed(firstRate?.rate, 4)

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

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Free API integrations</p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">Public and preview Malaysia signals</h2>
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-3">
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">Warehouse directory</p>
              <div className="mt-3 space-y-2">
                {warehousePreview.slice(0, 3).map((item) => (
                  <div key={item.name} className="rounded-xl bg-white/[0.04] px-3 py-3">
                    <p className="font-montserrat text-sm font-semibold text-white">{item.name}</p>
                    <p className="font-lexend mt-1 text-xs text-white/54">{item.city}, {item.state} • {item.source}</p>
                  </div>
                ))}
              </div>
              <p className="font-lexend mt-3 text-xs leading-6 text-white/48">Public/preview warehouse directory, not verified capacity.</p>
            </div>
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">Port risk preview</p>
              <div className="mt-3 space-y-2">
                {portRisk.slice(0, 3).map((item) => (
                  <div key={item.port_name} className="rounded-xl bg-white/[0.04] px-3 py-3">
                    <p className="font-montserrat text-sm font-semibold text-white">{item.port_name}</p>
                    <p className="font-lexend mt-1 text-xs text-white/54">{item.pressure_status} • Score {item.pressure_score.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <p className="font-lexend mt-3 text-xs leading-6 text-white/48">Weather and preview port-risk signals, not live congestion.</p>
            </div>
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">Malaysia demand signals</p>
              <div className="mt-3 space-y-2">
                {demandSignals.slice(0, 3).map((item) => (
                  <div key={item.keyword_or_product} className="rounded-xl bg-white/[0.04] px-3 py-3">
                    <p className="font-montserrat text-sm font-semibold text-white">{item.keyword_or_product}</p>
                    <p className="font-lexend mt-1 text-xs text-white/54">{item.category || 'General'} • Score {item.score?.toFixed(1) ?? 'N/A'}</p>
                  </div>
                ))}
              </div>
              <p className="font-lexend mt-3 text-xs leading-6 text-white/48">Demand signals only. Not confirmed nationwide sales.</p>
            </div>
          </div>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">BNM FX support</p>
              <p className="font-montserrat mt-3 text-lg font-semibold text-white">
                {firstRate && formattedBnmRate
                  ? `1 ${firstRate.base_currency} = ${formattedBnmRate} ${firstRate.quote_currency}`
                  : 'No rate available'}
              </p>
              <p className="font-lexend mt-3 text-xs leading-6 text-white/48">
                Official BNM dataset where available. Later reused for landed-cost and purchasing support.
              </p>
            </div>
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">Provider status</p>
              <p className="font-montserrat mt-3 text-lg font-semibold text-white">
                {integrationStatus?.enabled_providers?.length ?? providers.length} enabled
              </p>
              <p className="font-lexend mt-3 text-xs leading-6 text-white/48">
                {integrationStatus?.warnings?.[0] || 'Backend-managed providers only. Secrets never leave FastAPI.'}
              </p>
            </div>
          </div>
        </div>

        <div className="app-surface min-w-0 rounded-[1.9rem] p-6">
          <p className="font-montserrat text-xs uppercase tracking-[0.22em] text-white/38">Premium and Boost</p>
          <div className="mt-5 grid gap-4">
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-sm font-semibold text-white">Premium own-store best sellers</p>
              <p className="font-lexend mt-3 text-sm leading-7 text-white/58">
                {user?.subscription_plan === 'FREE'
                  ? 'Upgrade to Premium to connect Shopee, Lazada, or TikTok Shop and view your own weekly best-selling products.'
                  : marketplaceStatus === 'available'
                    ? 'Marketplace provider credentials are ready. Connect your store to unlock user-owned sales sync.'
                    : 'Marketplace connection stub is available, but no store is connected yet.'}
              </p>
            </div>
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-sm font-semibold text-white">Boost market intelligence</p>
              <p className="font-lexend mt-3 text-sm leading-7 text-white/58">
                {user?.subscription_plan !== 'BOOST'
                  ? 'Boost is required for market-wide Malaysia best-seller intelligence and paid provider integrations.'
                  : marketIntelligenceStatus === 'not_configured'
                    ? 'Paid market-intelligence provider is not configured yet, so no national best-seller claims are shown.'
                    : 'Paid provider status is available through the backend contract.'}
              </p>
            </div>
            <div className="app-surface-soft rounded-[1.35rem] p-4">
              <p className="font-montserrat text-sm font-semibold text-white">Provider registry</p>
              <p className="font-lexend mt-3 text-sm leading-7 text-white/58">
                {providers.length} backend-managed providers registered. All external data stays behind FastAPI and respects workspace plan gating.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
