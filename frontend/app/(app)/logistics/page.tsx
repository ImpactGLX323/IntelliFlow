'use client'

import { useEffect, useState } from 'react'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import RecommendationCard from '@/components/ui/RecommendationCard'
import { copilotAPI } from '@/lib/api'
import type { AICapabilities, AgentRecommendation, CopilotQueryResponse } from '@/types/copilot'

export default function LogisticsPage() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [response, setResponse] = useState<CopilotQueryResponse | null>(null)
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const capabilitiesResponse = await copilotAPI.getCapabilities()
        setCapabilities(capabilitiesResponse.data)

        if (capabilitiesResponse.data.features.logistics_control_tower) {
          const [queryResponse, recommendationResponse] = await Promise.all([
            copilotAPI.query('Are any international shipments delayed?'),
            copilotAPI.getRecommendations({ domain: 'logistics', limit: 6 }),
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

  if (!capabilities?.features.logistics_control_tower) {
    return (
      <PlanAccessNotice
        requiredPlan="BOOST"
        title="Logistics Control Tower is available on Boost."
        body="Shipment delay impact, international visibility, route delay intelligence, and affected-order tracing are enforced at the backend and require Boost access."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Logistics Control Tower</p>
        <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
          Delay visibility with business impact.
        </h1>
        <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          Boost workspaces can inspect delayed shipments, affected orders, revenue at risk, and mitigation recommendations from the Logistics MCP domain.
        </p>
      </section>

      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Control tower output</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/[0.04] p-4 text-xs text-white/72">
          {JSON.stringify(response?.result ?? {}, null, 2)}
        </pre>
      </section>

      <div className="grid gap-4">
        {recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  )
}
