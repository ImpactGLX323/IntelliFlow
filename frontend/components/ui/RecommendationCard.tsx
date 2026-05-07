import type { AgentRecommendation } from '@/types/copilot'

function severityTone(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-red-500/12 text-red-200 ring-red-300/20'
    case 'high':
      return 'bg-amber-500/12 text-amber-200 ring-amber-300/20'
    case 'medium':
      return 'bg-sky-500/12 text-sky-200 ring-sky-300/20'
    default:
      return 'bg-emerald-500/12 text-emerald-200 ring-emerald-300/20'
  }
}

function InlineList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) {
    return null
  }

  return (
    <div>
      <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={`${label}-${item}`} className="max-w-full break-all rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/72">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RecommendationCard({ recommendation }: { recommendation: AgentRecommendation }) {
  return (
    <article className="rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/38">
            {recommendation.domain} • {recommendation.recommendation_type.replaceAll('_', ' ')}
          </p>
          <h3 className="font-montserrat mt-3 text-xl font-semibold text-white">{recommendation.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ${severityTone(recommendation.severity)}`}>
          {recommendation.severity}
        </span>
      </div>

      <p className="font-lexend mt-4 text-sm leading-7 text-white/74">{recommendation.explanation}</p>

      <div className="mt-5 grid gap-4">
        <InlineList label="Affected SKUs" items={recommendation.affected_skus} />
        <InlineList label="Affected Orders" items={recommendation.affected_orders} />
        <InlineList label="Affected Shipments" items={recommendation.affected_shipments} />
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/8 pt-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="min-w-0">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">Recommended action</p>
          <p className="font-lexend mt-2 text-sm text-white/72">
            {recommendation.recommended_action ?? 'Review and decide the next operational action.'}
          </p>
        </div>
        <div className="text-sm text-white/54">Status: {recommendation.status}</div>
        <div className="text-sm text-white/54">{new Date(recommendation.created_at).toLocaleString()}</div>
      </div>
    </article>
  )
}
