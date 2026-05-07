export const integrationTruthLabels = {
  demandSignals: 'Demand signal only. Not confirmed sales volume.',
  portRisk: 'Weather/marine risk and preview port pressure only. Not live AIS or confirmed congestion.',
  warehouseDirectory: 'Directory/location data only. Availability and capacity are not verified.',
};

export function toPreviewBadgeLabel(payload) {
  if (!payload) {
    return 'Preview';
  }
  if (payload.is_live) {
    return 'Live';
  }
  return payload.source === 'preview' || payload.is_preview ? 'Preview' : 'Public';
}
