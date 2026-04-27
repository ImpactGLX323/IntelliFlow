import type { AICapabilities } from '@/types/copilot'

export default function CapabilityBadge({ capabilities }: { capabilities: AICapabilities | null }) {
  const planLevel = capabilities?.plan_level ?? 'FREE'

  return (
    <div className="inline-flex rounded-full border border-[#d7ff4d]/24 bg-[#d7ff4d]/8 px-3 py-2 font-lexend text-xs uppercase tracking-[0.16em] text-[#d7ff4d]/85">
      Plan {planLevel}
    </div>
  )
}
