'use client'

import Image from 'next/image'
import Link from 'next/link'
import logo from '@/docs/images/intelliflow.png'

const kpiCards = [
  {
    title: 'Port & Transit Intelligence',
    metric: '14 Shipments Inbound',
    subtext: 'Port Klang (MYPKG) Status: Normal.',
    tooltip: 'Direct API integration with Malaysia’s maritime hubs for arrival predictions.',
  },
  {
    title: 'Regional E-commerce Sync',
    metric: '99.8% Sync Accuracy',
    subtext: 'Active: Shopee, Lazada, TikTok Shop MY/ID.',
    tooltip: 'Real-time stock locking across ASEAN platforms to prevent overselling.',
  },
  {
    title: 'High-Precision Tracking',
    metric: '4,200 SKU (ESD-Safe)',
    subtext: 'Penang/Kulim Tech Hub Standards: Compliant.',
    tooltip: 'Specialized handling tags for the semiconductor and electronics supply chain.',
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
    <div className="hud-public min-h-screen overflow-x-hidden p-3 text-[#111318] sm:p-6">
      <section className="ive-device relative mx-auto min-h-[680px] w-full max-w-[1580px] overflow-hidden rounded-[1.8rem] text-white sm:min-h-[760px] sm:rounded-[2.8rem]">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
          <source src="/images/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,10,0.96),rgba(7,8,10,0.88)_44%,rgba(7,8,10,0.72))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%)]" />

        <header className="relative z-10 px-6 pt-8 sm:px-10">
          <div className="mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
              <span className="truncate font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/68 sm:tracking-[0.38em]">
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
              className="font-montserrat rounded-full border border-white/12 bg-white/[0.08] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-xl"
            >
              Login
            </Link>
          </div>
        </header>

        <div className="relative z-10 px-6 pb-20 pt-16 sm:px-10 sm:pb-32 sm:pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl min-w-0">
              <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#b9c7d8]">
                ASEAN Inventory Intelligence
              </p>
              <h1 className="text-balance font-montserrat mt-6 max-w-4xl text-[clamp(2.7rem,8vw,5rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                ASEAN’s SCM Pulse, Your Precision.
              </h1>
              <p className="font-lexend mt-6 max-w-2xl text-base leading-8 text-[#c8d2de] sm:text-lg">
                Empowering Southeast Asian enterprises with real-time visibility and cross-border intelligence. From the heart of Malaysia to the corners of ASEAN, we turn your inventory into an engine for growth.
              </p>

              <div className="mt-10 flex min-w-0 flex-wrap gap-4">
                <Link
                  href="#features"
                  className="font-montserrat rounded-full bg-white px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#111318] sm:px-7"
                >
                  Explore Solutions
                </Link>
                <Link
                  href="#kpis"
                  className="font-montserrat rounded-full border border-white/20 bg-transparent px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.08em] text-white/88 sm:px-7"
                >
                  View Regional Trade Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="kpis" className="px-2 py-16 sm:px-4 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#9b6a35]">
              Core KPI Grid
            </p>
            <h2 className="text-balance font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#111318] sm:text-4xl">
              Regional signals in a compact decision layer.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {kpiCards.map((card) => (
              <article
                key={card.title}
                className="ive-device relative min-w-0 overflow-hidden rounded-[2rem] p-5 text-white sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-montserrat text-sm font-semibold uppercase tracking-[0.08em] text-white/88 sm:tracking-[0.12em]">
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
                <p className="font-montserrat mt-8 text-[clamp(1.55rem,4vw,1.875rem)] font-semibold tracking-[-0.03em] text-white sm:mt-10">
                  {card.metric}
                </p>
                <p className="font-lexend mt-4 text-sm leading-7 text-[#b8c5d3]">{card.subtext}</p>
                <p className="font-lexend mt-6 text-xs leading-6 text-white/46">{card.tooltip}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-2 pb-16 sm:px-4 sm:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#9b6a35]">
              Strategic Features
            </p>
            <h2 className="text-balance font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#111318] sm:text-4xl">
              Built for cross-border execution and compliance.
            </h2>
          </div>

          <div className="mt-10 grid gap-5">
            {strategicFeatures.map((feature) => (
              <article
                key={feature.heading}
                className="grid min-w-0 gap-6 rounded-[2rem] border border-black/5 bg-white/70 px-6 py-7 shadow-[0_24px_80px_-60px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start"
              >
                <div>
                  <p className="font-montserrat text-2xl font-semibold tracking-[-0.03em] text-[#111318]">
                    {feature.heading}
                  </p>
                </div>
                <p className="font-lexend text-sm leading-8 text-[#4b515b] sm:text-base">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="esg" className="px-2 pb-6 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 rounded-[1.5rem] bg-[#dce7dc] px-6 py-4 text-[#163626] lg:flex-row lg:items-center lg:gap-4">
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
