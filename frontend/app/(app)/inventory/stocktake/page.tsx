import FeaturePlaceholder from '@/components/ui/FeaturePlaceholder'

export default function InventoryStocktakePage() {
  return (
    <FeaturePlaceholder
      eyebrow="Stocktake"
      title="Stocktake workflow scaffolded."
      body="This route is reserved for cycle counts, variance reconciliation, and warehouse stock verification."
      ctaHref="/inventory"
      ctaLabel="Back to inventory"
    />
  )
}
