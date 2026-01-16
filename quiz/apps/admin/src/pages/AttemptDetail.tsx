import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAttemptDetail, AttemptDetailResponse } from '../lib/api'

export default function AttemptDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AttemptDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) loadAttempt()
  }, [id])

  const loadAttempt = async () => {
    try {
      const result = await getAttemptDetail(id!)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempt')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleString()

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return '-'
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    const durationMs = end - start
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const formatTimeSpent = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const parseDeviceInfo = (deviceInfo: Record<string, unknown> | null) => {
    if (!deviceInfo) return null
    return {
      platform: deviceInfo.platform as string || 'Unknown',
      browser: deviceInfo.browser as string || deviceInfo.userAgent as string || 'Unknown',
      screenResolution: deviceInfo.screenResolution as string || deviceInfo.screen as string || 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error || 'Attempt not found'}
      </div>
    )
  }

  const { attempt, answers, events } = data
  const deviceInfo = parseDeviceInfo(attempt.deviceInfo)

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/attempts" className="text-blue-600 hover:text-blue-800">&larr; Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">Attempt Details</h1>
      </div>

      {/* Score Summary Card */}
      {attempt.status === 'submitted' && (
        <div className={`rounded-lg shadow p-6 mb-6 ${attempt.pass ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {attempt.scorePercent?.toFixed(1)}%
              </div>
              <div className={`text-lg font-semibold ${attempt.pass ? 'text-green-600' : 'text-red-600'}`}>
                {attempt.pass ? 'PASSED' : 'FAILED'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Correct Answers</div>
              <div className="text-2xl font-semibold">{attempt.correctAnswers} / {attempt.totalQuestions}</div>
              <div className="text-sm text-gray-500">Passing: {attempt.passingPercent}%</div>
            </div>
          </div>
        </div>
      )}

      {/* User & Quiz Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">User & Quiz Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="User Name" value={attempt.userName} />
          <InfoItem label="Email" value={attempt.userEmail} />
          <InfoItem label="Quiz" value={attempt.quizTitle} />
          <InfoItem label="Attempt #" value={`#${attempt.attemptNo}`} />
        </div>
      </div>

      {/* Attempt Status & Timing */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Status & Timing</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              attempt.status === 'submitted'
                ? 'bg-green-100 text-green-800'
                : attempt.status === 'in_progress'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {attempt.status}
            </span>
          </div>
          <InfoItem label="Started" value={formatDate(attempt.startedAt)} />
          <InfoItem label="Ended" value={attempt.endedAt ? formatDate(attempt.endedAt) : '-'} />
          <InfoItem label="Duration" value={formatDuration(attempt.startedAt, attempt.endedAt)} />
          <InfoItem label="Time Limit" value={`${Math.ceil(attempt.timeLimitSec / 60)} minutes`} />
          <InfoItem label="Total Questions" value={String(attempt.totalQuestions)} />
          <div>
            <div className="text-sm text-gray-500">Restart Count</div>
            {attempt.restartCount > 0 ? (
              <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                {attempt.restartCount} restarts
              </span>
            ) : (
              <span className="font-medium">0</span>
            )}
          </div>
          <InfoItem label="Last Restart Reason" value={attempt.restartReasonLast || '-'} />
        </div>
      </div>

      {/* Device & Network Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Device & Network Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="IP Address" value={attempt.ip || 'Not available'} />
          <InfoItem label="Platform" value={deviceInfo?.platform || 'Not available'} />
          <InfoItem label="Browser" value={deviceInfo?.browser || 'Not available'} />
          <InfoItem label="Screen Resolution" value={deviceInfo?.screenResolution || 'Not available'} />
        </div>
        {attempt.userAgent && (
          <div className="mt-4">
            <div className="text-sm text-gray-500">User Agent</div>
            <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
              {attempt.userAgent}
            </div>
          </div>
        )}
        {attempt.deviceInfo && (
          <div className="mt-4">
            <div className="text-sm text-gray-500">Raw Device Info</div>
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(attempt.deviceInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Answers ({answers.length} questions)</h2>
        <div className="space-y-4">
          {answers.map((answer, index) => {
            const isCorrect = JSON.stringify([...answer.selected].sort()) === JSON.stringify([...answer.correct].sort())
            return (
              <div key={answer.questionId} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="font-medium">Q{index + 1}: {answer.prompt}</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      Time: <span className="font-medium">{formatTimeSpent(answer.timeSpentMs)}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {answer.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded flex items-center gap-2 ${
                        answer.correct.includes(i)
                          ? 'bg-green-200 border border-green-300'
                          : answer.selected.includes(i)
                          ? 'bg-red-200 border border-red-300'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {answer.selected.includes(i) && (
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                          answer.correct.includes(i) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {answer.correct.includes(i) ? '✓' : '✗'}
                        </span>
                      )}
                      <span>{opt}</span>
                      {answer.correct.includes(i) && !answer.selected.includes(i) && (
                        <span className="text-xs text-green-700 ml-auto">(correct answer)</span>
                      )}
                    </div>
                  ))}
                </div>
                {answer.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Explanation:</div>
                    <div className="text-sm text-blue-800">{answer.explanation}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Event Timeline ({events.length} events)</h2>

        {/* Event Summary */}
        {events.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Event Summary</div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const counts: Record<string, number> = {}
                events.forEach(e => {
                  counts[e.event_type] = (counts[e.event_type] || 0) + 1
                })
                return Object.entries(counts).map(([type, count]) => (
                  <span
                    key={type}
                    className={`px-2 py-1 rounded text-xs ${
                      type.includes('restart') || type.includes('exit') || type.includes('blur') || type.includes('switch')
                        ? 'bg-red-100 text-red-700'
                        : type.includes('submit') || type.includes('start')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type}: {count}
                  </span>
                ))
              })()}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 py-1">
              <span className="text-gray-400 font-mono text-xs whitespace-nowrap">
                {new Date(event.event_at).toLocaleTimeString()}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                event.event_type.includes('restart') || event.event_type.includes('exit') || event.event_type.includes('blur') || event.event_type.includes('switch')
                  ? 'bg-red-100 text-red-700'
                  : event.event_type.includes('submit') || event.event_type.includes('start')
                  ? 'bg-green-100 text-green-700'
                  : event.event_type.includes('answer')
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {event.event_type}
              </span>
              {event.payload && (
                <span className="text-gray-500 text-xs break-all">
                  {JSON.stringify(event.payload)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
