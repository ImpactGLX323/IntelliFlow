'use client'

import { useState } from 'react'
import { aiAPI } from '@/lib/api'

interface RoadmapTask {
  title: string
  description: string
  priority: string
  category: string
  estimated_impact: string
  action_items: string[]
}

interface RoadmapResponse {
  summary: string
  tasks: RoadmapTask[]
  insights: string[]
  generated_at: string
}

export default function CopilotDock({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [query, setQuery] = useState('')
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!query.trim()) {
      setError('Enter a prompt for Copilot.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await aiAPI.generateRoadmap(query)
      setRoadmap(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate roadmap')
    } finally {
      setLoading(false)
    }
  }

  const priorityTone = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/12 text-red-200'
      case 'high':
        return 'bg-amber-500/12 text-amber-200'
      case 'medium':
        return 'bg-sky-500/12 text-sky-200'
      case 'low':
        return 'bg-emerald-500/12 text-emerald-200'
      default:
        return 'bg-white/10 text-white/70'
    }
  }

  return (
    <div className="fixed right-0 top-[96px] z-50 hidden h-[calc(100vh-120px)] items-start lg:flex">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="font-montserrat mr-4 rounded-l-2xl rounded-r-none border border-r-0 border-white/12 bg-[#0d1b2d]/92 px-4 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-xl [writing-mode:vertical-rl]"
        >
          AI Copilot
        </button>
      )}

      {expanded && (
        <aside className="mr-4 flex h-full w-[380px] flex-col overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#0c1624]/94 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                AI Copilot
              </p>
              <p className="font-montserrat mt-1 text-lg font-semibold text-white">Workspace Assistant</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/68"
              >
                Minimize
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <label className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
              Ask Copilot
            </label>
            <textarea
              rows={5}
              className="font-lexend mt-3 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/26 focus:border-white/22"
              placeholder="How can I reduce low-stock risk across my top-selling products this month?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="font-montserrat mt-4 w-full rounded-full bg-[#0f223a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10 disabled:opacity-60"
            >
              {loading ? 'Generating...' : 'Generate roadmap'}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!roadmap && (
              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/40">Suggested prompts</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Prioritize reorders for my fastest-moving SKUs',
                    'Find the biggest risks in recent sales performance',
                    'Create a 30-day inventory stabilization plan',
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="font-lexend w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/74"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {roadmap && (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/40">Summary</p>
                  <p className="font-lexend mt-3 text-sm leading-7 text-white/76">{roadmap.summary}</p>
                </div>

                {roadmap.insights?.length > 0 && (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/40">Insights</p>
                    <div className="mt-3 space-y-2">
                      {roadmap.insights.map((insight, index) => (
                        <div key={index} className="font-lexend rounded-xl bg-white/[0.03] px-3 py-3 text-sm text-white/72">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {roadmap.tasks.map((task, index) => (
                    <div key={index} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-montserrat text-base font-semibold text-white">{task.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${priorityTone(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="font-lexend mt-3 text-sm leading-7 text-white/68">{task.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-white/36">
                        <span>{task.category}</span>
                        <span>{task.estimated_impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
