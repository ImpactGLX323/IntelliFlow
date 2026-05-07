import { apiClient } from '@/lib/api/client'

export const copilotAPI = {
  generateRoadmap: (query: string, focusAreas?: string[]) =>
    apiClient.post('/api/ai/roadmap', { query, focus_areas: focusAreas }),
  getInsights: () => apiClient.get('/api/ai/insights'),
  query: (message: string, organizationId?: string | null) =>
    apiClient.post('/ai-copilot/query', { message, organization_id: organizationId ?? null, user_plan: 'FREE' }),
  getCapabilities: () => apiClient.get('/api/ai/capabilities'),
  getRecommendations: (params?: { domain?: string; limit?: number }) =>
    apiClient.get('/api/ai/recommendations', { params }),
}
