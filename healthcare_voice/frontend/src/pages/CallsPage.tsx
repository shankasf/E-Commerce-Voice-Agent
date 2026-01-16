import { useEffect, useState } from 'react'
import api from '../services/api'
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface CallLog {
  logId: string
  direction: 'inbound' | 'outbound'
  status: string
  agentType: string
  callReason: string
  durationSeconds: number
  callSummary: string
  resolutionStatus: string
  createdAt: string
  patient?: { firstName: string; lastName: string }
}

interface Stats {
  totalCalls: number
  completedCalls: number
  avgDuration: number
  resolutionRate: number
  inboundCalls: number
  outboundCalls: number
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [callsRes, statsRes] = await Promise.all([
        api.get('/call-logs', { params: { take: 50 } }),
        api.get('/call-logs/stats'),
      ])
      setCalls(callsRes.data.logs)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch call data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'missed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
        <p className="text-gray-500">Voice agent call history and analytics</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completedCalls}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Avg Duration</p>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Resolution Rate</p>
            <p className="text-2xl font-bold text-primary-600">{stats.resolutionRate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Inbound</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inboundCalls}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Outbound</p>
            <p className="text-2xl font-bold text-purple-600">{stats.outboundCalls}</p>
          </div>
        </div>
      )}

      {/* Call List */}
      {calls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <PhoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No call logs</h3>
          <p className="text-gray-500">Start using the voice agent to see call history</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.logId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {call.direction === 'inbound' ? (
                        <PhoneArrowDownLeftIcon className="w-5 h-5 text-blue-500 mr-2" />
                      ) : (
                        <PhoneArrowUpRightIcon className="w-5 h-5 text-purple-500 mr-2" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{call.direction}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(call.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {call.patient ? (
                      <p className="text-gray-900">
                        {call.patient.firstName} {call.patient.lastName}
                      </p>
                    ) : (
                      <p className="text-gray-400">Unknown</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{call.callReason || '-'}</p>
                    {call.callSummary && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">{call.callSummary}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-gray-500">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {formatDuration(call.durationSeconds)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        call.status
                      )}`}
                    >
                      {call.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        call.resolutionStatus === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : call.resolutionStatus === 'needs_follow_up'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {call.resolutionStatus?.replace('_', ' ') || '-'}
                    </span>
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
