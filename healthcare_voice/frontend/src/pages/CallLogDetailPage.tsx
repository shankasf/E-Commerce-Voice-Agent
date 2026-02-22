import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  ArrowLeftIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  StarIcon,
  TagIcon,
  FireIcon,
  FaceSmileIcon,
  FaceFrownIcon,
} from '@heroicons/react/24/outline'

interface Analytics {
  sentimentLabel: string | null
  sentimentScore: number | null
  leadClassification: string | null
  leadScore: number | null
  intent: string | null
  keyTopics: string[]
  patientSatisfaction: number | null
  escalationRequired: boolean
  escalationReason: string | null
  aiSummary: string | null
  analyzedAt: string | null
}

interface CallLogDetail {
  logId: string
  sessionId: string
  direction: 'inbound' | 'outbound'
  status: string
  agentType: string
  callReason: string
  durationSeconds: number
  transcript: string
  callSummary: string
  resolutionStatus: string
  followUpRequired: boolean
  followUpNotes: string
  startedAt: string
  endedAt: string
  createdAt: string
  patient?: {
    patientId: string
    firstName: string
    lastName: string
    phonePrimary: string
    email: string
    dateOfBirth: string
  }
  provider?: {
    firstName: string
    lastName: string
    title: string
    specialization: string
  }
  appointment?: {
    appointmentId: string
    scheduledDate: string
    scheduledTime: string
    status: string
    service?: { name: string }
  }
  analytics: Analytics | null
}

interface TranscriptMessage {
  role: 'Patient' | 'Agent'
  text: string
}

function parseTranscript(transcript: string): TranscriptMessage[] {
  if (!transcript) return []
  const lines = transcript.split('\n\n')
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^\[(Patient|Agent)\]:\s*(.*)$/s)
      if (match) {
        return { role: match[1] as 'Patient' | 'Agent', text: match[2].trim() }
      }
      return { role: 'Agent' as const, text: line.trim() }
    })
}

function SentimentBadge({ label }: { label: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof FaceSmileIcon }> = {
    positive: { bg: 'bg-green-100', text: 'text-green-800', icon: FaceSmileIcon },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaceSmileIcon },
    negative: { bg: 'bg-red-100', text: 'text-red-800', icon: FaceFrownIcon },
    mixed: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaceSmileIcon },
  }
  const c = config[label] || config.neutral
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-4 h-4 mr-1" />
      {label}
    </span>
  )
}

function LeadBadge({ classification }: { classification: string }) {
  const config: Record<string, string> = {
    hot: 'bg-red-100 text-red-800',
    warm: 'bg-orange-100 text-orange-800',
    cold: 'bg-blue-100 text-blue-800',
    none: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config[classification] || config.none}`}>
      <FireIcon className="w-4 h-4 mr-1" />
      {classification}
    </span>
  )
}

function SatisfactionStars({ score }: { score: number }) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-5 h-5 ${star <= score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600">{score}/5</span>
    </div>
  )
}

export default function CallLogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<CallLogDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchLog(id)
  }, [id])

  const fetchLog = async (logId: string) => {
    try {
      const response = await api.get(`/call-logs/${logId}`)
      setLog(response.data)
    } catch (error) {
      console.error('Failed to fetch call log:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Call log not found</p>
        <button onClick={() => navigate('/calls')} className="mt-4 text-primary-600 hover:text-primary-800">
          Back to Conversations
        </button>
      </div>
    )
  }

  const messages = parseTranscript(log.transcript)
  const analytics = log.analytics

  return (
    <div>
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/calls')}
          className="p-2 hover:bg-gray-200 rounded-lg mr-3 transition"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${log.agentType === 'chat' ? 'bg-emerald-100' : 'bg-primary-100'}`}>
              {log.agentType === 'chat' ? (
                <ChatBubbleLeftRightIcon className={`w-6 h-6 text-emerald-600`} />
              ) : (
                <PhoneIcon className={`w-6 h-6 text-primary-600`} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {log.agentType === 'chat' ? 'Chat Session' : 'Voice Call'} Details
              </h1>
              <p className="text-sm text-gray-500">{formatDateTime(log.startedAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            log.status === 'completed' ? 'bg-green-100 text-green-800' :
            log.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {log.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary */}
          {analytics?.aiSummary && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Summary</h2>
              <p className="text-gray-700 leading-relaxed">{analytics.aiSummary}</p>
            </div>
          )}

          {/* Analytics Metrics */}
          {analytics && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Sentiment</p>
                  {analytics.sentimentLabel ? (
                    <SentimentBadge label={analytics.sentimentLabel} />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Lead Quality</p>
                  {analytics.leadClassification ? (
                    <LeadBadge classification={analytics.leadClassification} />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Intent</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    <TagIcon className="w-4 h-4 mr-1" />
                    {analytics.intent?.replace(/_/g, ' ') || '-'}
                  </span>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Satisfaction</p>
                  {analytics.patientSatisfaction ? (
                    <SatisfactionStars score={analytics.patientSatisfaction} />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>

              {/* Key Topics */}
              {analytics.keyTopics && analytics.keyTopics.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Key Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.keyTopics.map((topic, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Escalation Alert */}
              {analytics.escalationRequired && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Escalation Required</p>
                      <p className="text-sm text-red-700 mt-1">{analytics.escalationReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Score Bar */}
              {analytics.leadScore != null && analytics.leadScore > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Lead Score</span>
                    <span className="font-medium text-gray-900">{analytics.leadScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        analytics.leadScore >= 70 ? 'bg-red-500' :
                        analytics.leadScore >= 40 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${analytics.leadScore}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Conversation Transcript</h2>
              <p className="text-sm text-gray-500">{messages.length} messages</p>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No transcript available</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'Patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end space-x-2 max-w-[80%] ${msg.role === 'Patient' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'Patient' ? 'bg-primary-100' : log.agentType === 'chat' ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        {msg.role === 'Patient' ? (
                          <UserIcon className="w-4 h-4 text-primary-600" />
                        ) : log.agentType === 'chat' ? (
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <PhoneIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'Patient'
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          {/* Call Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Session Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{log.agentType === 'chat' ? 'Chat' : 'Voice Call'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Direction</span>
                <span className="font-medium capitalize">{log.direction}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{formatDuration(log.durationSeconds)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Started</span>
                <span className="font-medium text-right text-xs">{formatDateTime(log.startedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ended</span>
                <span className="font-medium text-right text-xs">{formatDateTime(log.endedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Resolution</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  log.resolutionStatus?.includes('scheduled') ? 'bg-green-100 text-green-800' :
                  log.resolutionStatus?.includes('cancelled') ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {log.resolutionStatus?.replace(/_/g, ' ') || '-'}
                </span>
              </div>
              {log.callReason && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reason</span>
                  <span className="font-medium">{log.callReason.replace(/_/g, ' ')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Session ID</span>
                <span className="font-mono text-xs text-gray-400">{log.sessionId?.slice(-12)}</span>
              </div>
            </div>
          </div>

          {/* Patient Info */}
          {log.patient && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Patient</h3>
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-medium">
                    {log.patient.firstName[0]}{log.patient.lastName[0]}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{log.patient.firstName} {log.patient.lastName}</p>
                  {log.patient.phonePrimary && (
                    <p className="text-sm text-gray-500">{log.patient.phonePrimary}</p>
                  )}
                </div>
              </div>
              {log.patient.email && (
                <p className="text-sm text-gray-500">{log.patient.email}</p>
              )}
            </div>
          )}

          {/* Appointment Info */}
          {log.appointment && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Related Appointment</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span>{new Date(log.appointment.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                </div>
                <div className="flex items-center text-sm">
                  <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span>{log.appointment.scheduledTime}</span>
                </div>
                {log.appointment.service && (
                  <p className="text-sm text-gray-600">{log.appointment.service.name}</p>
                )}
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  log.appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  log.appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {log.appointment.status}
                </span>
              </div>
            </div>
          )}

          {/* Provider Info */}
          {log.provider && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Provider</h3>
              <p className="font-medium text-gray-900">
                {log.provider.title} {log.provider.firstName} {log.provider.lastName}
              </p>
              <p className="text-sm text-gray-500">{log.provider.specialization}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
