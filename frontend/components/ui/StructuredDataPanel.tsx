import type { ReactNode } from 'react'

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatScalar(value: string | number | boolean) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  }

  return value
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function renderPrimitive(value: string | number | boolean) {
  return <span className="break-all text-sm leading-7 text-white/84">{formatScalar(value)}</span>
}

function renderArray(value: unknown[], depth: number): ReactNode {
  if (!value.length) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/42">No items</div>
  }

  if (value.every(isPrimitive)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span
            key={`${String(item)}-${index}`}
            className="max-w-full break-all rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-white/72"
          >
            {formatScalar(item)}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      {value.map((item, index) => (
        <div key={index} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {renderValue(item, depth + 1)}
        </div>
      ))}
    </div>
  )
}

function renderObject(value: Record<string, unknown>, depth: number): ReactNode {
  const entries = Object.entries(value)

  if (!entries.length) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/42">No details</div>
  }

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      {entries.map(([key, nestedValue]) => (
        <div key={key} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/38">
            {formatLabel(key)}
          </p>
          <div className="mt-2 min-w-0">
            {depth >= 2 && typeof nestedValue === 'object' && nestedValue !== null
              ? <span className="break-all text-sm leading-7 text-white/72">{JSON.stringify(nestedValue)}</span>
              : renderValue(nestedValue, depth + 1)}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-sm text-white/42">None</span>
  }

  if (isPrimitive(value)) {
    return renderPrimitive(value)
  }

  if (Array.isArray(value)) {
    return renderArray(value, depth)
  }

  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, depth)
  }

  return <span className="break-words text-sm leading-7 text-white/84">{String(value)}</span>
}

export default function StructuredDataPanel({
  data,
  emptyMessage = 'No structured data available.',
}: {
  data: unknown
  emptyMessage?: string
}) {
  const isEmptyObject =
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Object.keys(data as Record<string, unknown>).length === 0

  if (data === null || data === undefined || isEmptyObject) {
    return (
      <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/48">
        {emptyMessage}
      </div>
    )
  }

  return <div className="min-w-0">{renderValue(data)}</div>
}
