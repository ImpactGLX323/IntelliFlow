import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  return (
    <FeaturePlaceholder
      eyebrow="Sale Detail"
      title={`Sales record ${params.id} is scaffolded.`}
      body="This route is ready for invoice metadata, order linkage, customer context, and fulfillment status."
      ctaHref="/sales"
      ctaLabel="Back to sales"
    />
  )
}
