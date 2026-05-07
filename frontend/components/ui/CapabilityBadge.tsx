import type { AICapabilities } from '@/types/copilot'

export default function CapabilityBadge({ capabilities }: { capabilities: AICapabilities | null }) {
  const planLevel = capabilities?.plan_level ?? 'FREE'
  const fallbackMode = capabilities?.provider_status?.fallback_mode

  return (
    <div
      className={`inline-flex rounded-full border px-3 py-2 font-lexend text-xs uppercase tracking-[0.16em] ${
        fallbackMode
          ? 'border-amber-300/24 bg-amber-500/8 text-amber-100'
          : 'border-[#d7ff4d]/24 bg-[#d7ff4d]/8 text-[#d7ff4d]/85'
      }`}
    >
      Plan {planLevel}{fallbackMode ? ' • Fallback' : ''}
    </div>
  )
}
