'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import EInvoicingSection from '@/components/home/EInvoicingSection'
import FeatureSection from '@/components/home/FeatureSection'
import HeroSection from '@/components/home/HeroSection'
import HomeLoadingPhase from '@/components/home/HomeLoadingPhase'
import HomeSectionReveal from '@/components/home/HomeSectionReveal'
import McpRagSection from '@/components/home/McpRagSection'

type ThemeMode = 'light' | 'dark'

const IndoPacificShipFlowMap = dynamic(() => import('@/components/home/IndoPacificShipFlowMap'), {
  ssr: false,
})

export default function LandingPage() {
  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('intelliflow-public-theme')
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('intelliflow-public-theme', theme)
  }, [theme])

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="hud-public min-h-screen overflow-x-hidden bg-[#f5f1ea] text-[#111318] transition-colors duration-300 dark:bg-[#120d0a] dark:text-[#f6efe6]">
        <HomeLoadingPhase />
        <Header
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        />
        <main>
          <HomeSectionReveal className="will-change-transform">
            <HeroSection />
          </HomeSectionReveal>

          <div className="pb-6">
            <HomeSectionReveal delay={60}>
              <IndoPacificShipFlowMap />
            </HomeSectionReveal>

            <HomeSectionReveal delay={100}>
              <FeatureSection
                id="plans"
                eyebrow="Inventory Services"
                title="High-Precision Inventory Management Services"
                description="Manage stock ledger tracking, real-time stock position, low-stock alerts, warehouse transfers, purchasing support, sales reservation against inventory, and stock movement traceability with service levels designed for different operating depth."
                bullets={[
                  'Built on a stock-ledger foundation so inventory movement stays traceable across purchasing, transfers, returns, and fulfillment.',
                  'Real-time stock position and low-stock alerts reduce blind spots before replenishment and sales commitments diverge.',
                  'Free, Premium, and Boost modes let teams start with visibility and grow into analytics, compliance intelligence, and logistics control.',
                ]}
                metrics={[
                  { label: 'Ledger visibility', value: 'SKU-level traceability' },
                  { label: 'Warehouse transfers', value: 'Controlled movement history' },
                  { label: 'Reservation support', value: 'Sales-aware allocation' },
                ]}
                actions={[
                  { label: 'Explore Free', href: '/plans', target: '_blank', variant: 'outline' },
                  { label: 'Explore Premium', href: '/plans', target: '_blank', variant: 'primary' },
                  { label: 'Explore Boost', href: '/plans', target: '_blank', variant: 'secondary' },
                ]}
              />
            </HomeSectionReveal>

            <HomeSectionReveal delay={140}>
              <FeatureSection
                id="control-tower"
                eyebrow="IntelliFlow Control Tower"
                title="Built for Supply-Chain Control, Not Just Stock Counting"
                description="IntelliFlow connects inventory, purchasing, sales, returns, logistics, MCP tools, and RAG agents so teams can understand what moved, why it moved, what is delayed, what is profitable, what is leaking margin, and what needs action next."
                bullets={[
                  'Stock ledger foundation that anchors inventory truth before recommendations and automation are applied.',
                  'AI-powered recommendations that connect operational signals to concrete next actions instead of generic summaries.',
                  'Malaysia compliance knowledge, logistics exception monitoring, and profit leakage detection in one operating context.',
                ]}
                metrics={[
                  { label: 'Decision view', value: 'Cross-functional control' },
                  { label: 'Operational focus', value: 'Delay, margin, and flow' },
                  { label: 'Action layer', value: 'Recommendations with context' },
                  { label: 'Compliance stance', value: 'Malaysia-ready workflows' },
                ]}
                actions={[{ label: 'See How IntelliFlow Works', href: '/copilot' }]}
              />
            </HomeSectionReveal>
          </div>

          <HomeSectionReveal delay={180}>
            <McpRagSection />
          </HomeSectionReveal>
          <HomeSectionReveal delay={220}>
            <EInvoicingSection />
          </HomeSectionReveal>
        </main>
        <Footer />
      </div>
    </div>
  )
}
