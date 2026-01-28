import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAttempt, Attempt } from '../lib/api'

export default function Result() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (attemptId) {
      loadAttempt()
    }
  }, [attemptId])

  const loadAttempt = async () => {
    try {
      const data = await getAttempt(attemptId!)
      setAttempt(data.attempt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load result')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Result not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-500"
          >
            Back to quizzes
          </button>
        </div>
      </div>
    )
  }

  const passed = attempt.pass
  const score = attempt.scorePercent || 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className={`py-8 px-6 text-center ${passed ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="text-6xl mb-4">
            {passed ? '🎉' : '😔'}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {passed ? 'Congratulations!' : 'Better Luck Next Time'}
          </h1>
          <p className="text-white/90">
            {passed ? 'You passed the quiz!' : 'You did not pass the quiz'}
          </p>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {score.toFixed(1)}%
            </div>
            <p className="text-gray-500">
              Passing score: {attempt.passingPercent}%
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Quiz</span>
              <span className="font-medium">{attempt.quizTitle}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Status</span>
              <span className={`font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'Passed' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium">
                {new Date(attempt.endedAt!).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
