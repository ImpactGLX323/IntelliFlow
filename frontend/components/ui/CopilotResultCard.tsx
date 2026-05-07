import type { ReactNode } from 'react'
import type { CopilotQueryResponse } from '@/types/copilot'
import StructuredDataPanel from '@/components/ui/StructuredDataPanel'

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-white/38">None</span>
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-white/38">No items</span>
    }
    return (
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        {value.map((item, index) => (
          <div key={index} className="min-w-0 rounded-xl bg-white/[0.04] p-3">
            <StructuredDataPanel data={item} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    return <StructuredDataPanel data={value} />
  }
  return <span className="text-white/76">{String(value)}</span>
}

export default function CopilotResultCard({ response }: { response: CopilotQueryResponse }) {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-montserrat break-all text-[11px] uppercase tracking-[0.18em] text-[#ff9b3d]/75">
            {response.intent} • {response.tools_used.join(', ') || 'template'}
          </p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">AI Copilot response</h2>
        </div>
        <div className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/64">
          {response.upgrade_required ? 'Upgrade required' : 'Structured result'}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/82">
        {response.answer}
      </div>

      {response.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {response.warnings.join(' ')}
        </div>
      )}

      {response.citations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">Citations</p>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {response.citations.map((citation, index) => (
              <div key={index} className="min-w-0 rounded-xl bg-white/[0.04] p-3">
                <StructuredDataPanel data={citation} />
              </div>
            ))}
          </div>
        </div>
      )}

      {response.recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">Recommended next actions</p>
          <ul className="space-y-2 text-sm text-white/76">
            {response.recommendations.map((recommendation) => (
              <li key={recommendation} className="rounded-xl bg-white/[0.03] px-4 py-3 leading-7">
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 min-w-0 space-y-4">
        {Object.entries(response.data).map(([key, value]) => (
          <div key={key} className="min-w-0">
            <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">{key.replaceAll('_', ' ')}</p>
            <div className="mt-2 min-w-0">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
