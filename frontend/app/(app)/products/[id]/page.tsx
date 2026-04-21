import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return (
    <FeaturePlaceholder
      eyebrow="Product Detail"
      title={`Product ${params.id} detail workspace is scaffolded.`}
      body="This route is ready for SKU-level inventory history, supplier context, pricing controls, and regional stock movement."
      ctaHref="/products"
      ctaLabel="Back to products"
    />
  )
}
