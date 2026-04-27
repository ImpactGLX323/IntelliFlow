'use client'

import { useEffect, useState } from 'react'
import RecommendationCard from '@/components/ui/RecommendationCard'
import { analyticsAPI, copilotAPI } from '@/lib/api'
import type { InventoryRisk } from '@/types/analytics'
import type { AgentRecommendation } from '@/types/copilot'

export default function InventoryPage() {
  const [risks, setRisks] = useState<InventoryRisk[]>([])
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [riskResponse, recommendationResponse] = await Promise.all([
          analyticsAPI.getInventoryRisks(),
          copilotAPI.getRecommendations({ domain: 'inventory', limit: 6 }),
        ])
        setRisks(riskResponse.data)
        setRecommendations(recommendationResponse.data)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  const criticalCount = risks.filter((item) => item.risk_level === 'critical').length
  const averageDaysOfStock = risks.length
    ? risks.reduce((sum, item) => sum + (item.days_of_stock ?? 0), 0) / risks.length
    : 0

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
