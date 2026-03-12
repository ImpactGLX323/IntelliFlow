'use client'

import Image from 'next/image'
import Link from 'next/link'
import logo from '../docs/images/Intelliflow.png'

const kpiCards = [
  {
    title: 'Port & Transit Intelligence',
    metric: '14 Shipments Inbound',
    subtext: 'Port Klang (MYPKG) Status: Normal.',
    tooltip:
      'Direct API integration with Malaysia’s maritime hubs for arrival predictions.',
  },
  {
    title: 'Regional E-commerce Sync',
    metric: '99.8% Sync Accuracy',
    subtext: 'Active: Shopee, Lazada, TikTok Shop MY/ID.',
    tooltip:
      'Real-time stock locking across ASEAN platforms to prevent overselling.',
  },
  {
    title: 'High-Precision Tracking',
    metric: '4,200 SKU (ESD-Safe)',
    subtext: 'Penang/Kulim Tech Hub Standards: Compliant.',
    tooltip:
      'Specialized handling tags for the semiconductor and electronics supply chain.',
  },
]

const strategicFeatures = [
  {
    heading: 'ASEAN Express Tracker',
    description:
      'Monitor land-bridge shipments across the Malaysia-Thailand-Laos-China rail link. Adjusts for regional holidays and route congestion to optimize reorder points.',
  },
  {
    heading: 'LHDN-Ready e-Invoicing',
    description:
      'Automated SST compliance and mandatory e-Invoicing for 2026. Transition seamlessly with MyInvois Portal integration and audit-ready data exports.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08111d] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#08111d]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/images/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,17,29,0.96),rgba(8,17,29,0.88)_42%,rgba(8,17,29,0.74))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_28%)]" />

        <header className="relative z-10 px-6 pt-8 sm:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
              <span className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.38em] text-white/68">
                IntelliFlow
              </span>
            </Link>

            <nav className="font-montserrat hidden items-center gap-10 text-xs uppercase tracking-[0.16em] text-white/62 md:flex">
              <Link href="/" className="text-white">
                Home
              </Link>
              <Link href="#kpis" className="hover:text-white">
                Dashboard
              </Link>
              <Link href="#features" className="hover:text-white">
                Features
              </Link>
              <Link href="#esg" className="hover:text-white">
                ESG
              </Link>
            </nav>

            <Link
              href="/login"
              className="font-montserrat rounded-full bg-[#0f223a] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white ring-1 ring-white/10"
            >
              Login
            </Link>
          </div>
        </header>

        <div className="relative z-10 px-6 pb-28 pt-20 sm:px-10 sm:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#b9c7d8]">
                ASEAN Inventory Intelligence
              </p>
              <h1 className="font-montserrat mt-6 max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                ASEAN’s SCM Pulse, Your Precision.
              </h1>
              <p className="font-lexend mt-6 max-w-2xl text-base leading-8 text-[#c8d2de] sm:text-lg">
                Empowering Southeast Asian enterprises with real-time visibility and cross-border intelligence. From the heart of Malaysia to the corners of ASEAN, we turn your inventory into an engine for growth.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="#features"
                  className="font-montserrat rounded-full bg-[#0f223a] px-7 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10"
                >
                  Explore Solutions
                </Link>
                <Link
                  href="#kpis"
                  className="font-montserrat rounded-full border border-white/20 bg-transparent px-7 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/88"
                >
                  View Regional Trade Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="kpis" className="border-b border-white/10 bg-[#091523] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#8ea2ba]">
              Core KPI Grid
            </p>
            <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Regional signals in a compact decision layer.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {kpiCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-white/12 bg-white/[0.03] p-6 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-montserrat text-sm font-semibold uppercase tracking-[0.12em] text-white/88">
                      {card.title}
                    </p>
                  </div>
                  <span
                    className="font-montserrat inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 text-xs text-white/55"
                    title={card.tooltip}
                  >
                    i
                  </span>
                </div>
                <p className="font-montserrat mt-10 text-3xl font-semibold tracking-[-0.03em] text-white">
                  {card.metric}
                </p>
                <p className="font-lexend mt-4 text-sm leading-7 text-[#b8c5d3]">
                  {card.subtext}
                </p>
                <p className="font-lexend mt-6 text-xs leading-6 text-white/46">{card.tooltip}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-white/10 bg-[#08111d] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#8ea2ba]">
              Strategic Features
            </p>
            <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Built for cross-border execution and compliance.
            </h2>
          </div>

          <div className="mt-10 grid gap-5">
            {strategicFeatures.map((feature) => (
              <article
                key={feature.heading}
                className="grid gap-6 rounded-[1.8rem] border border-white/12 bg-white/[0.03] px-6 py-7 backdrop-blur-sm lg:grid-cols-[0.78fr_1.22fr] lg:items-start"
              >
                <div>
                  <p className="font-montserrat text-2xl font-semibold tracking-[-0.03em] text-white">
                    {feature.heading}
                  </p>
                </div>
                <p className="font-lexend text-sm leading-8 text-[#c1ccd8] sm:text-base">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="esg" className="bg-[#dce7dc] px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[#163626] lg:flex-row lg:items-center lg:gap-4">
          <span className="font-montserrat text-xs font-bold uppercase tracking-[0.18em]">
            ESG IMPACT: CARBON MILES TRACKER
          </span>
          <p className="font-lexend text-sm leading-7 text-[#224333]">
            Under NIMP 2030, transparency is your brand. Monitor your inventory’s carbon footprint from "Port to Shelf" and generate export-ready reports for international buyers.
          </p>
        </div>
      </section>
    </div>
  )
}
