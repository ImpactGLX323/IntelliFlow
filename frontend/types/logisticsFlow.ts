export type FlowSource =
  | 'preview'
  | 'portcast'
  | 'gocomet'
  | 'marinetraffic'
  | 'datalastic'
  | 'fallback_preview'

export type PressureStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
export type FlowRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
export type FlowDirection = 'EAST_TO_WEST' | 'WEST_TO_EAST' | 'NORTH_TO_SOUTH' | 'SOUTH_TO_NORTH'

export interface LogisticsFlowSummary {
  routes_monitored: number
  malaysian_ports_monitored: number
  average_malaysia_port_pressure: number
  high_pressure_ports: number
  medium_pressure_ports: number
  low_pressure_ports: number
  estimated_regional_flow_intensity: number
}

export interface MalaysiaPortFeatureProperties {
  kind: 'malaysia_port'
  port_code: string
  port_name: string
  state: string
  pressure_status: PressureStatus
  pressure_score: number
  average_delay_hours: number
  vessels_waiting: number
  vessels_berthed: number
  berth_utilization_pct: number
  customs_alerts: number
  last_updated: string
  missing_data?: string[]
}

export interface ShippingLaneFeatureProperties {
  kind: 'shipping_lane'
  route_name: string
  origin_region: string
  destination_region: string
  affected_malaysia_ports: string[]
  flow_intensity: number
  estimated_vessel_count: number
  average_delay_hours: number
  risk_level: FlowRiskLevel
  direction: FlowDirection
}

export interface VesselClusterFeatureProperties {
  kind: 'vessel_cluster'
  cluster_name: string
  estimated_vessels: number
  dominant_direction: FlowDirection
  flow_intensity: number
  source_note: string
}

export interface MalaysiaPortFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: MalaysiaPortFeatureProperties
}

export interface ShippingLaneFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: Array<[number, number]>
  }
  properties: ShippingLaneFeatureProperties
}

export interface VesselClusterFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: VesselClusterFeatureProperties
}

export type GeoJsonFeature = MalaysiaPortFeature | ShippingLaneFeature | VesselClusterFeature

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export interface IndoPacificFlowResponse {
  is_live: boolean
  source: FlowSource
  last_updated: string
  region: 'Indo-Pacific'
  summary: LogisticsFlowSummary
  geojson: GeoJsonFeatureCollection
  provider_error?: string | null
}
