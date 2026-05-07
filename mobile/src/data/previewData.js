export const previewData = {
  inventorySummary: {
    total_revenue: 18420,
    total_orders: 146,
    total_products: 8,
    low_stock_alerts: 2,
    top_sellers: [
      { product_name: 'Basmati Rice 10kg', total_quantity: 42 },
      { product_name: 'Cooking Oil 5L', total_quantity: 37 },
      { product_name: 'Infant Formula', total_quantity: 19 },
    ],
  },
  logistics: {
    average_pressure: 0.54,
    high_pressure_ports: 1,
    monitored_ports: 9,
  },
  copilot: {
    answer: 'Preview mode only. Connect to the backend to run live IntelliFlow Copilot analysis.',
    recommendations: [
      'Review low-stock coverage for infant formula.',
      'Track delayed inbound replenishment to Port Klang.',
      'Investigate return leakage in personal care items.',
    ],
  },
  plans: ['FREE', 'PREMIUM', 'BOOST'],
};
