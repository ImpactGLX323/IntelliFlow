import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  return (
    <FeaturePlaceholder
      eyebrow="Return"
      title={`Return ${params.id} is scaffolded.`}
      body="Use this route for return reason tracking, resolution status, and stock recovery handling."
      ctaHref="/returns"
      ctaLabel="Back to returns"
    />
  )
}
