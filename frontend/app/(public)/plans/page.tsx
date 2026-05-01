import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'

const plans = [
  {
    name: 'Free',
    price: 'RM0 / month',
    description: 'A lightweight workspace for early inventory visibility.',
    features: [
      'Basic inventory tracking',
      'Basic supply tracking',
      'Limited stock visibility',
    ],
    cta: 'Start Free',
    variant: 'outline' as const,
  },
  {
    name: 'Premium',
    price: 'RMXXX / month',
    description: 'Deeper product, sales, and AI insight for scaling teams.',
    features: [
      'Best product sales insights',
      'Returns/profit intelligence',
      'RAG agents',
      'Advanced analytics',
    ],
    cta: 'Choose Premium',
    variant: 'primary' as const,
  },
  {
    name: 'Boost',
    price: 'RMXXX / month',
    description: 'A control tower for logistics, compliance, and flow optimization.',
    features: [
      'Logistics control tower',
      'MCP-powered recommendations',
      'Advanced RAG compliance',
      'Route delay intelligence',
      'Supplier and inventory flow optimization',
    ],
    cta: 'Unlock Boost',
    variant: 'secondary' as const,
  },
]

export default function PlansPage() {
  return (
    <div className="hud-public min-h-screen text-[#111318]">
      <Header />
      <main className="px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="mx-auto max-w-7xl">
          <section className="app-surface rounded-[2rem] px-6 py-10 text-white sm:px-8 lg:px-12">
            <div className="max-w-3xl">
              <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#e3b98d]">
                Plans
              </p>
              <h1 className="text-balance font-montserrat mt-5 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#fff5ea]">
                Inventory intelligence that scales from visibility to control.
              </h1>
              <p className="font-lexend mt-5 text-sm leading-8 text-[#d9c9bb] sm:text-base">
                Placeholder pricing is used here until live commercial values are finalized. The plan structure reflects the current product direction.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className="app-surface-soft rounded-[1.8rem] p-6"
                >
                  <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-[#c8b29e]">
                    {plan.name}
                  </p>
                  <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#fff5ea]">
                    {plan.price}
                  </h2>
                  <p className="font-lexend mt-4 text-sm leading-7 text-[#d9c9bb]">
                    {plan.description}
                  </p>
                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-[#efe2d6]">
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button href="/register" variant={plan.variant} className="mt-6 w-full">
                    {plan.cta}
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
