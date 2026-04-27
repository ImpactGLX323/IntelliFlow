export interface RoadmapTask {
  title: string
  description: string
  priority: string
  category: string
  estimated_impact: string
  action_items: string[]
}

export interface RoadmapResponse {
  summary: string
  tasks: RoadmapTask[]
  insights: string[]
  generated_at: string
}

export interface AgentRecommendation {
  id: number
  job_name: string
  domain: string
  recommendation_type: string
  severity: string
  title: string
  explanation: string
  affected_skus: string[]
  affected_orders: string[]
  affected_shipments: string[]
  recommended_action: string | null
  status: string
  created_at: string
}

export interface AICapabilities {
  plan_level: 'FREE' | 'PRO' | 'BOOST'
  allowed_domains: string[]
  features: {
    inventory_insights: boolean
    sales_insights: boolean
    returns_profit: boolean
    compliance_rag: boolean
    logistics_control_tower: boolean
    advanced_recommendations: boolean
  }
}

export interface CopilotQueryResponse {
  domain: string
  action: string
  query: string
  result: Record<string, unknown>
  warnings: string[]
  permission_denied: boolean
  request_id: string | null
}
