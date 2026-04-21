import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function ManufacturingOrdersPage() {
  return (
    <FeaturePlaceholder
      eyebrow="Manufacturing Orders"
      title="Production order workspace scaffolded."
      body="This route is reserved for work orders, build progress, and material consumption tracking."
      ctaHref="/manufacturing/boms"
      ctaLabel="View BOMs"
    />
  )
}
