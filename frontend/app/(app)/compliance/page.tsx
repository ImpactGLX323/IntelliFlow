'use client'

import { useEffect, useState } from 'react'
import PlanAccessNotice from '@/components/ui/PlanAccessNotice'
import { copilotAPI } from '@/lib/api'
import type { AICapabilities, CopilotQueryResponse } from '@/types/copilot'

export default function CompliancePage() {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [response, setResponse] = useState<CopilotQueryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const capabilitiesResponse = await copilotAPI.getCapabilities()
        setCapabilities(capabilitiesResponse.data)

        if (capabilitiesResponse.data.features.compliance_rag) {
          const query = capabilitiesResponse.data.plan_level === 'BOOST'
            ? 'What does Malaysian customs law say about this shipment?'
            : 'Summarize the relevant Malaysian customs regulation for a shipment review.'
          const queryResponse = await copilotAPI.query(query)
          setResponse(queryResponse.data)
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

  if (!capabilities?.features.compliance_rag) {
    return (
      <PlanAccessNotice
        requiredPlan="PRO"
        title="Compliance RAG is available on Pro."
        body="Basic Malaysian official-document search and citation-backed summaries require Pro. Boost extends this with customs and transport compliance risk tools."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Compliance RAG</p>
        <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
          Malaysia regulation context for operations.
        </h1>
        <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          The compliance view uses the internal RAG MCP domain and returns source references with warnings when passage-level citation retrieval is unavailable.
        </p>
      </section>

      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Compliance output</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/[0.04] p-4 text-xs text-white/72">
          {JSON.stringify(response?.result ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  )
}
