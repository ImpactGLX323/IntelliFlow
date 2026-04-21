import Link from 'next/link'

export default function FeaturePlaceholder({
  eyebrow,
  title,
  body,
  ctaHref = '/dashboard',
  ctaLabel = 'Return to dashboard',
}: {
  eyebrow: string
  title: string
  body: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 text-white backdrop-blur-sm sm:rounded-[2rem] sm:p-8">
      <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">
        {eyebrow}
      </p>
      <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white text-balance">
        {title}
      </h1>
      <p className="font-lexend mt-5 max-w-2xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
        {body}
      </p>
      <div className="mt-8">
        <Link
          href={ctaHref}
          className="font-montserrat rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
