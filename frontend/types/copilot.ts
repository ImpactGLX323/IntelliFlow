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
