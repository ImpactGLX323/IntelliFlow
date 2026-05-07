'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <section className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Profile</p>
        <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
          Workspace identity and subscription context.
        </h1>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          ['Email', user?.email ?? 'Unknown'],
          ['Name', user?.full_name ?? 'Unknown'],
          ['Organization', user?.organization_id ? `Org #${user.organization_id}` : 'Not assigned'],
          ['Plan', user?.subscription_plan ?? 'FREE'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="font-lexend mt-3 text-lg text-white">{value}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
