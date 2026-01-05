'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { aiAPI } from '@/lib/api'

interface RoadmapTask {
  title: string
  description: string
  priority: string
  category: string
  estimated_impact: string
  action_items: string[]
}

interface RoadmapResponse {
  summary: string
  tasks: RoadmapTask[]
  insights: string[]
  generated_at: string
}

export default function CopilotPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const handleGenerate = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    setLoading(true)
    setError('')
    setRoadmap(null)

    try {
      const response = await aiAPI.generateRoadmap(query)
      setRoadmap(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate roadmap')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Copilot</h1>
        <p className="text-gray-600 mb-8">
          Ask questions about your business and get AI-powered actionable roadmaps and insights.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to know?
              </label>
              <textarea
                id="query"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., How can I improve my inventory management? What are the biggest risks to my business? How can I increase sales?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Generating roadmap...' : 'Generate Roadmap'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {roadmap && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <p className="text-gray-700">{roadmap.summary}</p>
            </div>

            {/* Insights */}
            {roadmap.insights && roadmap.insights.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Key Insights</h2>
                <ul className="list-disc list-inside space-y-2">
                  {roadmap.insights.map((insight, index) => (
                    <li key={index} className="text-gray-700">{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tasks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Actionable Roadmap</h2>
              <div className="space-y-4">
                {roadmap.tasks.map((task, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                      <span className="font-medium">Category:</span>
                      <span>{task.category}</span>
                      <span className="font-medium">Impact:</span>
                      <span>{task.estimated_impact}</span>
                    </div>
                    {task.action_items && task.action_items.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Action Items:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {task.action_items.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

