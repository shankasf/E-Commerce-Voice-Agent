import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  FireIcon,
  StarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface CallAnalytics {
  sentimentLabel: string | null
  leadClassification: string | null
  intent: string | null
  patientSatisfaction: number | null
  escalationRequired: boolean
}

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
  analytics?: CallAnalytics | null
}

interface Stats {
  totalCalls: number
  completedCalls: number
  avgDuration: number
  resolutionRate: number
  inboundCalls: number
  outboundCalls: number
  voiceCalls: number
  chatSessions: number
  sentimentBreakdown: { positive: number; neutral: number; negative: number; mixed: number }
  leadBreakdown: { hot: number; warm: number; cold: number }
  avgSatisfaction: number
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      timeZone: 'Asia/Kolkata',
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

  const getSentimentIcon = (label: string | null) => {
    if (!label) return null
    switch (label) {
      case 'positive':
        return <FaceSmileIcon className="w-5 h-5 text-green-500" />
      case 'negative':
        return <FaceFrownIcon className="w-5 h-5 text-red-500" />
      case 'mixed':
        return <FaceSmileIcon className="w-5 h-5 text-yellow-500" />
      default:
        return <FaceSmileIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getLeadColor = (classification: string | null) => {
    switch (classification) {
      case 'hot':
        return 'text-red-600'
      case 'warm':
        return 'text-orange-500'
      case 'cold':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
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
        <h1 className="text-2xl font-bold text-gray-900">Conversation Logs</h1>
        <p className="text-gray-500">AI agent interaction history and analytics</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="space-y-4 mb-8">
          {/* Row 1: Basic stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedCalls}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Resolution</p>
              <p className="text-2xl font-bold text-primary-600">{stats.resolutionRate}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 flex items-center"><MicrophoneIcon className="w-3 h-3 mr-1" /> Voice</p>
              <p className="text-2xl font-bold text-blue-600">{stats.voiceCalls}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 flex items-center"><ChatBubbleLeftRightIcon className="w-3 h-3 mr-1" /> Chat</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.chatSessions}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Satisfaction</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.avgSatisfaction}</p>
                <StarIcon className="w-5 h-5 text-yellow-400 ml-1" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Hot Leads</p>
              <p className="text-2xl font-bold text-red-600">{stats.leadBreakdown.hot}</p>
            </div>
          </div>

          {/* Row 2: Sentiment breakdown bar */}
          {(stats.sentimentBreakdown.positive + stats.sentimentBreakdown.neutral + stats.sentimentBreakdown.negative + stats.sentimentBreakdown.mixed) > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-2">Sentiment Distribution</p>
              <div className="flex rounded-full overflow-hidden h-3">
                {stats.sentimentBreakdown.positive > 0 && (
                  <div className="bg-green-500" style={{ width: `${(stats.sentimentBreakdown.positive / stats.totalCalls) * 100}%` }} title={`Positive: ${stats.sentimentBreakdown.positive}`} />
                )}
                {stats.sentimentBreakdown.neutral > 0 && (
                  <div className="bg-gray-400" style={{ width: `${(stats.sentimentBreakdown.neutral / stats.totalCalls) * 100}%` }} title={`Neutral: ${stats.sentimentBreakdown.neutral}`} />
                )}
                {stats.sentimentBreakdown.mixed > 0 && (
                  <div className="bg-yellow-400" style={{ width: `${(stats.sentimentBreakdown.mixed / stats.totalCalls) * 100}%` }} title={`Mixed: ${stats.sentimentBreakdown.mixed}`} />
                )}
                {stats.sentimentBreakdown.negative > 0 && (
                  <div className="bg-red-500" style={{ width: `${(stats.sentimentBreakdown.negative / stats.totalCalls) * 100}%` }} title={`Negative: ${stats.sentimentBreakdown.negative}`} />
                )}
              </div>
              <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1" /> Positive ({stats.sentimentBreakdown.positive})</span>
                <span className="flex items-center"><span className="w-2 h-2 bg-gray-400 rounded-full mr-1" /> Neutral ({stats.sentimentBreakdown.neutral})</span>
                <span className="flex items-center"><span className="w-2 h-2 bg-yellow-400 rounded-full mr-1" /> Mixed ({stats.sentimentBreakdown.mixed})</span>
                <span className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1" /> Negative ({stats.sentimentBreakdown.negative})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call List */}
      {calls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <PhoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logs yet</h3>
          <p className="text-gray-500">Start using the voice or chat agent to see interaction history</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr
                  key={call.logId}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => navigate(`/calls/${call.logId}`)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {call.agentType === 'chat' ? (
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-emerald-500 mr-2" />
                      ) : call.direction === 'inbound' ? (
                        <PhoneArrowDownLeftIcon className="w-5 h-5 text-blue-500 mr-2" />
                      ) : (
                        <PhoneArrowUpRightIcon className="w-5 h-5 text-purple-500 mr-2" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {call.agentType === 'chat' ? 'Chat' : 'Voice'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDateTime(call.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {call.patient ? (
                      <p className="text-sm text-gray-900">{call.patient.firstName} {call.patient.lastName}</p>
                    ) : (
                      <p className="text-sm text-gray-400">Unknown</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-xs">
                      {call.callSummary || call.callReason?.replace(/_/g, ' ') || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {formatDuration(call.durationSeconds)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getSentimentIcon(call.analytics?.sentimentLabel || null)}
                      <span className="text-sm text-gray-600 capitalize">
                        {call.analytics?.sentimentLabel || '-'}
                      </span>
                      {call.analytics?.escalationRequired && (
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 ml-1" title="Escalation required" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <FireIcon className={`w-4 h-4 ${getLeadColor(call.analytics?.leadClassification || null)}`} />
                      <span className="text-sm capitalize">{call.analytics?.leadClassification || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                      {call.status?.replace('_', ' ')}
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
