'use client'

import { useEffect, useState } from 'react'
import CapabilityBadge from '@/components/ui/CapabilityBadge'
import RecommendationCard from '@/components/ui/RecommendationCard'
import { copilotAPI } from '@/lib/api'
import type { AICapabilities, AgentRecommendation } from '@/types/copilot'

export default function RecommendationsPage() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [capabilitiesResponse, recommendationsResponse] = await Promise.all([
          copilotAPI.getCapabilities(),
          copilotAPI.getRecommendations({ limit: 20 }),
        ])
        setCapabilities(capabilitiesResponse.data)
        setRecommendations(recommendationsResponse.data)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Agent Recommendations</p>
            <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
              Scheduled signals across operations.
            </h1>
          </div>
          <CapabilityBadge capabilities={capabilities} />
        </div>
        <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          Recommendations shown here come from MCP-backed daily and weekly scans. The backend filters them by plan before they reach the browser.
        </p>
      </section>

      <div className="grid gap-4">
        {recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  )
}
