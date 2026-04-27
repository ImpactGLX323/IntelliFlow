import type { ReactNode } from 'react'
import type { CopilotQueryResponse } from '@/types/copilot'

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-white/38">None</span>
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-white/38">No items</span>
    }
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <pre key={index} className="overflow-x-auto rounded-xl bg-white/[0.04] p-3 text-xs text-white/72">
            {JSON.stringify(item, null, 2)}
          </pre>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    return <pre className="overflow-x-auto rounded-xl bg-white/[0.04] p-3 text-xs text-white/72">{JSON.stringify(value, null, 2)}</pre>
  }
  return <span className="text-white/76">{String(value)}</span>
}

export default function CopilotResultCard({ response }: { response: CopilotQueryResponse }) {
  return (
    <section className="rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#ff9b3d]/75">
            {response.domain} • {response.action}
          </p>
          <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">AI Copilot response</h2>
        </div>
        <div className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/64">
          {response.permission_denied ? 'Permission denied' : 'Structured result'}
        </div>
      </div>

      {response.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {response.warnings.join(' ')}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {Object.entries(response.result).map(([key, value]) => (
          <div key={key}>
            <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/34">{key.replaceAll('_', ' ')}</p>
            <div className="mt-2">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
