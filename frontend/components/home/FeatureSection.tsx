import Button from '@/components/ui/Button'

type FeatureMetric = {
  label: string
  value: string
}

type FeatureAction = {
  label: string
  href: string
  target?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
}

type FeatureSectionProps = {
  id: string
  eyebrow: string
  title: string
  description: string
  note?: string
  bullets: string[]
  metrics: FeatureMetric[]
  actions: FeatureAction[]
}

export default function FeatureSection({
  id,
  eyebrow,
  title,
  description,
  note,
  bullets,
  metrics,
  actions,
}: FeatureSectionProps) {
  return (
    <section id={id} className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <article className="overflow-hidden rounded-[2rem] border border-[#604630] bg-[linear-gradient(180deg,rgba(29,20,16,0.94),rgba(18,13,10,0.96))] shadow-[0_42px_120px_-72px_rgba(0,0,0,0.78)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1a130f]/92 dark:shadow-[0_42px_120px_-72px_rgba(0,0,0,0.85)]">
          <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:min-h-[78vh] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:px-12">
            <div className="min-w-0">
              <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#9b6a35] dark:text-[#e3b98d]">
                {eyebrow}
              </p>
              <h2 className="text-balance font-montserrat mt-5 text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[#faf0e5] dark:text-[#faf0e5]">
                {title}
              </h2>
              <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#d9c9bb] sm:text-base dark:text-[#d9c9bb]">
                {description}
              </p>
              {note && (
                <div className="mt-6 inline-flex rounded-full border border-[#f3d8b7] bg-[#fff6ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a5a2a] dark:border-[#6e4a31] dark:bg-[#2b1d15] dark:text-[#f1d3b3]">
                  {note}
                </div>
              )}

              <div className="mt-8 grid gap-3">
                {bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-[#efe2d6] shadow-[0_18px_45px_-38px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-[#241913] dark:text-[#efe2d6]"
                  >
                    {bullet}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    href={action.href}
                    target={action.target}
                    rel={action.target === '_blank' ? 'noopener noreferrer' : undefined}
                    variant={action.variant ?? 'primary'}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 shadow-[0_28px_75px_-50px_rgba(15,23,42,0.28)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(40,28,21,0.95),rgba(28,20,15,0.94))]"
                >
                  <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.18em] text-[#c8b29e] dark:text-[#c8b29e]">
                    {metric.label}
                  </p>
                  <p className="font-montserrat mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.05em] text-[#fff5ea] dark:text-[#fff5ea]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
