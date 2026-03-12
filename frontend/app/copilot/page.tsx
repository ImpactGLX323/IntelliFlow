'use client'

import Link from 'next/link'
import Layout from '@/components/Layout'

export default function CopilotPage() {
  return (
    <Layout>
      <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-8 text-white backdrop-blur-sm">
        <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
          AI Copilot
        </p>
        <h1 className="font-montserrat mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
          Copilot now lives in the right-side dock.
        </h1>
        <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
          Use the expandable Copilot panel on the right, similar to an editor assistant sidebar.
          It stays available beside the dashboard, products, and sales views.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="font-montserrat rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </Layout>
  )
}
