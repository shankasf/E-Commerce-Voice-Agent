import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAttempts, AttemptSummary } from '../lib/api'

export default function Attempts() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadAttempts()
  }, [statusFilter])

  const loadAttempts = async () => {
    try {
      const data = await getAttempts({ status: statusFilter || undefined })
      setAttempts(data.attempts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempts')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return '-'
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    const durationMs = end - start
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attempts</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restarts</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{attempt.userName}</div>
                    <div className="text-xs text-gray-500">{attempt.userEmail}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.quizTitle}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    #{attempt.attemptNo}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      attempt.status === 'submitted'
                        ? 'bg-green-100 text-green-800'
                        : attempt.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {attempt.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {attempt.scorePercent !== null ? (
                      <div className="flex flex-col">
                        <span className={`font-medium ${attempt.pass ? 'text-green-600' : 'text-red-600'}`}>
                          {attempt.scorePercent.toFixed(1)}%
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          attempt.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {attempt.totalQuestions}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(attempt.startedAt, attempt.endedAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {attempt.restartCount > 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                        {attempt.restartCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                    {attempt.ip || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(attempt.startedAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      to={`/attempts/${attempt.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
