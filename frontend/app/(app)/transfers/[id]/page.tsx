import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function TransferDetailPage({ params }: { params: { id: string } }) {
  return (
    <FeaturePlaceholder
      eyebrow="Transfer"
      title={`Transfer ${params.id} is scaffolded.`}
      body="Use this route for origin and destination details, stock movement lines, and transfer confirmation."
      ctaHref="/transfers"
      ctaLabel="Back to transfers"
    />
  )
}
