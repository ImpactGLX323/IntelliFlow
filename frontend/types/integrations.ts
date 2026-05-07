export interface IntegrationProvider {
  key: string
  name: string
  category: string
  provider_type: string
  required_plan: 'FREE' | 'PREMIUM' | 'BOOST'
  is_enabled: boolean
  is_live_capable: boolean
  limits: Record<string, number>
  data_truth: string
  notes?: string | null
}

export interface IntegrationStatus {
  enabled_providers: string[]
  configured_providers: string[]
  preview_only_providers: string[]
  warnings: string[]
}

export interface BnmRateItem {
  base_currency: string
  quote_currency: string
  rate: number
  date: string
}

export interface BnmRatesResponse {
  source: string
  is_live: boolean
  data_truth: string
  rates: BnmRateItem[]
  warnings?: string[]
}

export interface WarehouseDirectoryItem {
  name: string
  state: string | null
  city: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  warehouse_type: string | null
  is_verified: boolean
  is_preview: boolean
  source: string
}

export interface PortRiskItem {
  port_name: string
  pressure_status: string
  pressure_score: number
  weather_risk: Record<string, unknown>
  marine_risk: Record<string, unknown>
  last_updated: string
  is_preview: boolean
}

export interface DemandSignalItem {
  rank: number | null
  keyword_or_product: string
  category: string | null
  score: number | null
  data_type: string
  confidence: string
  is_estimated: boolean
  is_live: boolean
  week_start: string
  week_end: string
}
