import Button from '@/components/ui/Button'

export default function EInvoicingSection() {
  return (
    <section id="e-invoicing" className="px-4 pb-14 sm:px-6 sm:pb-20">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(220,231,220,0.94),rgba(248,248,246,0.96))] px-6 py-8 shadow-[0_40px_100px_-70px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:px-12 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(35,26,20,0.96),rgba(24,18,14,0.96))]">
        <div>
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#476345] dark:text-[#b9d0b5]">
            Compliance Readiness
          </p>
          <h2 className="text-balance font-montserrat mt-5 text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#163626] dark:text-[#eff3eb]">
            LHDN-Ready e-Invoicing
          </h2>
          <p className="font-lexend mt-5 text-sm leading-8 text-[#31503f] sm:text-base dark:text-[#d7e0d2]">
            Designed to support Malaysia e-invoicing workflows with invoice readiness, compliance-aware transaction records, audit-friendly business data, and a future integration path for e-invoicing workflows.
          </p>
        </div>

        <div className="mt-8 space-y-4 lg:mt-0">
          <div className="rounded-[1.6rem] border border-[#bfd1bf] bg-white/72 p-5 dark:border-[#53634d] dark:bg-[#221a15]">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.18em] text-[#476345] dark:text-[#b9d0b5]">
              Built with compliance readiness in mind
            </p>
            <p className="font-lexend mt-3 text-sm leading-7 text-[#31503f] dark:text-[#d7e0d2]">
              Keep transaction trails, inventory context, and operational documents aligned for cleaner downstream invoicing and audit workflows.
            </p>
          </div>
          <Button href="/register" className="w-full sm:w-auto" variant="primary">
            Prepare Your Operations
          </Button>
        </div>
      </div>
    </section>
  )
}
