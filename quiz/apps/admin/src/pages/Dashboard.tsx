import { useState, useEffect } from 'react'
import { getMetrics, MetricsResponse } from '../lib/api'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      const data = await getMetrics()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  const m = metrics?.metrics

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Attempts"
          value={m?.totalAttempts || 0}
          icon="📝"
        />
        <MetricCard
          title="Submitted"
          value={m?.submittedAttempts || 0}
          icon="✅"
        />
        <MetricCard
          title="Pass Rate"
          value={`${(m?.passRate || 0).toFixed(1)}%`}
          icon="🎯"
        />
        <MetricCard
          title="Avg Score"
          value={`${(m?.averageScore || 0).toFixed(1)}%`}
          icon="📊"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Active Quizzes"
          value={m?.activeQuizzes || 0}
          icon="❓"
        />
        <MetricCard
          title="Total Users"
          value={m?.totalUsers || 0}
          icon="👥"
        />
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-600 text-sm">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
