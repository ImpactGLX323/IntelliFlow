export default function PlanAccessNotice({
  requiredPlan,
  title,
  body,
}: {
  requiredPlan: 'PRO' | 'BOOST'
  title: string
  body: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-5 text-amber-50 backdrop-blur-sm">
      <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
        {requiredPlan} Feature
      </p>
      <h2 className="font-montserrat mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="font-lexend mt-3 max-w-2xl text-sm leading-7 text-amber-50/82">{body}</p>
    </div>
  )
}
