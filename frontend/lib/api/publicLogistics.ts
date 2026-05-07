import { apiClient } from '@/lib/api/client'
import type { IndoPacificFlowResponse } from '@/types/logisticsFlow'

export const publicLogisticsAPI = {
  getIndoPacificShipFlow: (params?: {
    include_ports?: boolean
    include_routes?: boolean
    include_vessel_clusters?: boolean
    provider?: string
  }) =>
    apiClient.get<IndoPacificFlowResponse>('/public/logistics/indo-pacific-ship-flow', { params }),
}
