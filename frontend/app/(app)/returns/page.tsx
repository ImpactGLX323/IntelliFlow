'use client'

import { useEffect, useState } from 'react'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import RecommendationCard from '@/components/ui/RecommendationCard'
import { copilotAPI } from '@/lib/api'
import type { AICapabilities, AgentRecommendation, CopilotQueryResponse } from '@/types/copilot'

export default function ReturnsPage() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [response, setResponse] = useState<CopilotQueryResponse | null>(null)
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const capabilitiesResponse = await copilotAPI.getCapabilities()
        setCapabilities(capabilitiesResponse.data)

        if (capabilitiesResponse.data.features.returns_profit) {
          const [queryResponse, recommendationResponse] = await Promise.all([
            copilotAPI.query('Which products are leaking profit due to returns?'),
            copilotAPI.getRecommendations({ domain: 'returns', limit: 6 }),
          ])
          setResponse(queryResponse.data)
          setRecommendations(recommendationResponse.data)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  if (!capabilities?.features.returns_profit) {
    return (
      <PlanAccessNotice
        requiredPlan="PRO"
        title="Returns profit leakage is available on Pro."
        body="Free workspaces can use basic inventory insight views, but return-adjusted margin, leakage analytics, and return spike detection are gated at Pro and above."
      />
    )
  }

  const items = Array.isArray(response?.result.items) ? response?.result.items : []

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Returns Profit Leakage</p>
        <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
          Margin erosion from reverse flow.
        </h1>
        <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          This view surfaces high-return products, profit leakage, and return spikes through the Returns MCP domain.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Flagged products', String(items?.length ?? 0)],
          ['Plan', capabilities.plan_level],
          ['Advanced investigations', capabilities.features.advanced_recommendations ? 'Enabled' : 'Locked'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="font-montserrat mt-3 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Copilot output</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/[0.04] p-4 text-xs text-white/72">
          {JSON.stringify(response?.result ?? {}, null, 2)}
        </pre>
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-[#ff9b3d]/75">Recommendations</p>
          <h2 className="font-montserrat mt-3 text-3xl font-semibold text-white">Return-driven actions</h2>
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
