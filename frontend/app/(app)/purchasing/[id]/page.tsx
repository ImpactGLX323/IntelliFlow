import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function PurchasingDetailPage({ params }: { params: { id: string } }) {
  return (
    <FeaturePlaceholder
      eyebrow="Purchase Order"
      title={`Purchase order ${params.id} is scaffolded.`}
      body="Use this route for PO line items, supplier correspondence, expected receipt dates, and receiving status."
      ctaHref="/purchasing"
      ctaLabel="Back to purchasing"
    />
  )
}
