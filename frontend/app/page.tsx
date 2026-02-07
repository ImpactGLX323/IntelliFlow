'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Manrope } from 'next/font/google'
import logo from '../docs/images/Intelliflow.png'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export default function Home() {
  return (
    <div className={`${manrope.className} bg-[#f6f8fb] text-slate-900`}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.18),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,_rgba(59,130,246,0.18),_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_rgba(148,163,184,0.35)_1px,_transparent_0)] bg-[length:24px_24px] opacity-40" />

        <header className="relative z-10 px-6 pt-8 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                IntelliFlow
              </span>
            </div>
            <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
              <Link href="#platform">Platform</Link>
              <Link href="#solutions">Solutions</Link>
              <Link href="#power">Why it works</Link>
              <Link href="#contact">Contact</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 md:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10 px-6 pb-16 pt-14 sm:px-10">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
                Supply chain intelligence
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
                Transform the way you move, make, and deliver.
              </h1>
              <p className="mt-4 max-w-xl text-base text-slate-600">
                IntelliFlow connects planning, fulfillment, and analytics so every
                team ships faster with less chaos.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/60"
                >
                  Start free trial
                </Link>
                <Link
                  href="#platform"
                  className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600"
                >
                  See the platform
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 hidden h-24 w-40 rounded-2xl border border-white bg-white/80 p-4 shadow-lg backdrop-blur md:block">
                <p className="text-xs font-semibold text-slate-500">On-time delivery</p>
                <p className="mt-2 text-2xl font-semibold">97.6%</p>
              </div>
              <div className="absolute -right-4 top-2 hidden h-24 w-36 rounded-2xl border border-white bg-white/80 p-4 shadow-lg backdrop-blur md:block">
                <p className="text-xs font-semibold text-slate-500">Route cost</p>
                <p className="mt-2 text-2xl font-semibold">$1.2M</p>
              </div>
              <div className="relative mx-auto flex h-[320px] w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-white bg-gradient-to-br from-sky-200/70 to-white p-10 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.45)]">
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-sky-500/30 to-cyan-200/60 blur-2xl" />
                <div className="relative h-48 w-48 rounded-full border border-sky-200/70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.7),_rgba(2,132,199,0.2)_55%,_transparent_70%)] shadow-inner animate-float-slow" />
              </div>
              <div className="absolute -bottom-8 right-8 hidden h-24 w-44 rounded-2xl border border-white bg-white/80 p-4 shadow-lg backdrop-blur md:block">
                <p className="text-xs font-semibold text-slate-500">Active lanes</p>
                <p className="mt-2 text-2xl font-semibold">1,240</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-white/60 bg-white/80 px-6 py-10 backdrop-blur sm:px-10">
          <div className="mx-auto grid max-w-6xl gap-6 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">30%</p>
              <p className="mt-2">Faster order cycles</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">25%</p>
              <p className="mt-2">Lower operational costs</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">99.9%</p>
              <p className="mt-2">Uptime and visibility</p>
            </div>
          </div>
        </section>
      </div>

      <section id="solutions" className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">
                Designed for every link in the chain
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                One command center for manufacturing, logistics, and retail teams.
              </h2>
            </div>
            <div className="space-y-4">
              {[
                'Manufacturing planning',
                'Logistics and fulfillment',
                'Retail operations',
                'Global supply chain visibility',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm"
                >
                  <span>{item}</span>
                  <span className="text-slate-400">→</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-2xl bg-emerald-100 blur-xl" />
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Vendor applications</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                  +12%
                </span>
              </div>
              <div className="mt-6 h-48 rounded-2xl bg-gradient-to-br from-slate-100 to-white" />
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  Avg response time
                  <p className="mt-2 text-lg font-semibold text-slate-900">2.4h</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  On-time vendors
                  <p className="mt-2 text-lg font-semibold text-slate-900">88%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative overflow-hidden bg-slate-950 px-6 py-20 text-white sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
              One platform. limitless possibilities.
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Bring every operation into a single command layer.
            </h2>
            <p className="mt-4 max-w-xl text-sm text-slate-300">
              Consolidate data, orchestrate workflows, and ship faster with a
              real-time operating system for your supply chain.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900"
            >
              Build your workspace
            </Link>
          </div>
          <div className="relative z-10 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="h-64 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5" />
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                Inventory
                <p className="mt-2 text-base font-semibold text-white">4,503</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                Routes
                <p className="mt-2 text-base font-semibold text-white">288</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                On-time
                <p className="mt-2 text-base font-semibold text-white">97%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="power" className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
              What makes it powerful
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Automations that keep your supply chain humming.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: 'Automated verification',
                description: 'Surface exceptions early with AI-backed validation.',
              },
              {
                title: 'Real-time tracking',
                description: 'Monitor every shipment and adjust routes instantly.',
              },
              {
                title: 'Compliance insights',
                description: 'Stay ahead of audits with continuous monitoring.',
              },
              {
                title: 'Performance insights',
                description: 'Understand cost, speed, and risk in a single view.',
              },
              {
                title: 'Supplier workflows',
                description: 'Standardize onboarding and vendor communication.',
              },
              {
                title: 'Unified reporting',
                description: 'Deliver executive-ready dashboards in minutes.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {feature.title}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-10">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-sky-500 to-emerald-400 p-10 text-white">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Let’s make your supply chain work smarter
              </p>
              <h3 className="mt-4 text-3xl font-semibold">
                Start with a pilot and see impact in weeks.
              </h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900"
              >
                Talk to sales
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white"
              >
                Request a demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-slate-950 px-6 py-12 text-slate-400 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Image src={logo} alt="IntelliFlow" className="h-8 w-auto" />
            <p className="text-xs text-slate-500">
              A modern operating system for supply chain teams.
            </p>
          </div>
          {[
            {
              title: 'Company',
              items: ['About', 'Careers', 'Security', 'Press'],
            },
            {
              title: 'Product',
              items: ['Platform', 'Integrations', 'Pricing', 'API'],
            },
            {
              title: 'Support',
              items: ['Docs', 'Status', 'Contact', 'Privacy'],
            },
          ].map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float-slow {
          animation: float 16s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
