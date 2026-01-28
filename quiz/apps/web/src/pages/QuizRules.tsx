import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuiz, Quiz } from '../lib/api'

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const isMobilePhone = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || ''

  // Check for phone-specific patterns (excluding tablets)
  const phonePatterns = [
    /Android.*Mobile/i,      // Android phones (not tablets)
    /iPhone/i,               // iPhone
    /iPod/i,                 // iPod
    /BlackBerry/i,           // BlackBerry
    /IEMobile/i,             // Windows Phone
    /Opera Mini/i,           // Opera Mini
    /Mobile.*Firefox/i,      // Firefox Mobile
    /webOS/i,                // webOS phones
    /Windows Phone/i,        // Windows Phone
  ]

  // Check if any phone pattern matches
  const isPhone = phonePatterns.some(pattern => pattern.test(userAgent))

  // Additional check: small screen size (phones typically < 768px width)
  const isSmallScreen = window.innerWidth < 768

  // Consider it a phone if either the user agent matches OR screen is too small
  return isPhone || (isSmallScreen && 'ontouchstart' in window)
}

export default function QuizRules() {
  const isiOSDevice = isIOS()
  const isMobile = isMobilePhone()
  const { quizId } = useParams<{ quizId: string }>()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (quizId) {
      loadQuiz()
    }
  }, [quizId])

  const loadQuiz = async () => {
    try {
      const data = await getQuiz(quizId!)
      setQuiz(data.quiz)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Quiz not found'}</p>
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

  // Block mobile phones
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mobile Phones Not Allowed</h1>
          <p className="text-gray-600 mb-6">
            This quiz cannot be taken on a mobile phone. Please use a desktop computer, laptop, or tablet to take this quiz.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>Why?</strong> To ensure a fair testing environment and prevent cheating, quizzes must be taken on a larger screen with full keyboard access.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to Quiz List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{quiz.title}</h1>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Questions</span>
            <span className="font-medium">{quiz.question_count}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Time Limit</span>
            <span className="font-medium">{formatTime(quiz.time_limit_sec)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Passing Score</span>
            <span className="font-medium">{quiz.passing_percent}%</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-yellow-800 mb-3">Quiz Rules</h2>
          <ul className="list-disc list-inside space-y-2 text-yellow-700 text-sm">
            {!isiOSDevice && <li>You must stay in fullscreen mode during the entire quiz</li>}
            <li>Switching tabs or windows will restart the quiz</li>
            <li>Copy, paste, and right-click are disabled</li>
            <li>Pressing the back button will restart the quiz</li>
            <li>Going to a previous question will restart the quiz</li>
            <li>The quiz will auto-submit when the timer runs out</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-800 text-sm">
            <strong>Important:</strong> {isiOSDevice
              ? 'Click the button below to start the quiz. Make sure you are ready before starting.'
              : 'Click the button below to enter fullscreen mode and start the quiz. Make sure you\'re ready before starting.'}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate(`/quiz/${quizId}`)}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isiOSDevice ? 'Start Quiz' : 'Enter Fullscreen & Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
