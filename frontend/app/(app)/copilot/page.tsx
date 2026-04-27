'use client'

import { useEffect, useState } from 'react'
import { copilotAPI } from '@/lib/api'
import CapabilityBadge from '@/components/ui/CapabilityBadge'
import CopilotResultCard from '@/components/ui/CopilotResultCard'
import RecommendationCard from '@/components/ui/RecommendationCard'
import type { AICapabilities, AgentRecommendation, CopilotQueryResponse } from '@/types/copilot'

const prompts = [
  'What products are low on stock?',
  'What are my best-selling products this week?',
  'Which products are leaking profit due to returns?',
  'Are any international shipments delayed?',
  'What does Malaysian customs law say about this shipment?',
]

export default function CopilotPage() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [query, setQuery] = useState(prompts[0])
  const [response, setResponse] = useState<CopilotQueryResponse | null>(null)
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [capabilitiesResponse, recommendationsResponse] = await Promise.all([
          copilotAPI.getCapabilities(),
          copilotAPI.getRecommendations({ limit: 4 }),
        ])
        setCapabilities(capabilitiesResponse.data)
        setRecommendations(recommendationsResponse.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load AI Copilot workspace.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleAsk = async () => {
    if (!query.trim()) {
      setError('Enter a copilot query.')
      return
    }

    setQuerying(true)
    setError('')
    try {
      const result = await copilotAPI.query(query)
      setResponse(result.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run copilot query.')
    } finally {
      setQuerying(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">AI Copilot</p>
              <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                MCP-backed operational assistant.
              </h1>
            </div>
            <CapabilityBadge capabilities={capabilities} />
          </div>
          <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            The copilot routes inventory, sales, returns, logistics, and compliance questions through the internal MCP layer.
          </p>
          <textarea
            rows={5}
            className="font-lexend mt-6 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuery(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/72"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAsk}
            disabled={querying}
            className="font-montserrat mt-5 rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10 disabled:opacity-60"
          >
            {querying ? 'Running query...' : 'Ask Copilot'}
          </button>
          {error && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
        </div>

        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Available domains</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(capabilities?.allowed_domains ?? []).map((domain) => (
              <span key={domain} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/74">
                {domain}
              </span>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            {Object.entries(capabilities?.features ?? {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/72">{key.replaceAll('_', ' ')}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${value ? 'bg-emerald-500/12 text-emerald-200' : 'bg-white/10 text-white/52'}`}>
                  {value ? 'Enabled' : 'Locked'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {response && <CopilotResultCard response={response} />}

      <section className="space-y-4">
        <div>
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-[#ff9b3d]/75">Agent Recommendations</p>
          <h2 className="font-montserrat mt-3 text-3xl font-semibold text-white">Recent operational signals</h2>
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
