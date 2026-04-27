export interface ShipmentLeg {
  id: number
  shipment_id: number
  sequence_number: number
  origin: string
  destination: string
  transport_mode: 'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'MULTIMODAL'
  carrier_name: string | null
  vessel_or_flight_number: string | null
  departure_time: string | null
  arrival_time: string | null
  status: string | null
  created_at: string
  updated_at: string | null
}

export interface Shipment {
  id: number
  shipment_number: string
  related_type: string | null
  related_id: string | null
  carrier_name: string | null
  tracking_number: string | null
  status: 'CREATED' | 'IN_TRANSIT' | 'DELAYED' | 'CUSTOMS_HOLD' | 'DELIVERED' | 'CANCELLED'
  origin: string | null
  destination: string | null
  estimated_arrival: string | null
  actual_arrival: string | null
  delay_reason: string | null
  customs_status: string | null
  documents_url: string | null
  created_at: string
  updated_at: string | null
  legs: ShipmentLeg[]
}

export interface Route {
  id: number
  name: string
  origin: string
  destination: string
  mode: 'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'MULTIMODAL'
  average_transit_days: number | null
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  created_at: string
  updated_at: string | null
}

export interface PortOrNode {
  id: number
  code: string | null
  name: string
  country: string | null
  node_type: 'PORT' | 'AIRPORT' | 'BORDER' | 'WAREHOUSE' | 'CUSTOMS_POINT'
  created_at: string
  updated_at: string | null
}
