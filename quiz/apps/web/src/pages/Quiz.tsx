import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuiz, startAttempt, restartAttempt, submitAttempt, saveAnswer, Question } from '../lib/api'
import { useQuizEnforcement } from '../hooks/useQuizEnforcement'
import { useEventLogger } from '../hooks/useEventLogger'

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

interface QuizState {
  attemptId: string
  questions: Question[]
  questionOrder: string[]
  currentIndex: number
  answers: Map<string, number[]>
  startedAt: Date
  timeLimitSec: number
  timeRemaining: number
}

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [showPrevConfirm, setShowPrevConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const questionStartTime = useRef<number>(Date.now())

  // Check for mobile phone on mount
  useEffect(() => {
    if (isMobilePhone()) {
      setIsMobile(true)
      setLoading(false)
    }
  }, [])

  const { addEvent, flushEvents } = useEventLogger({
    attemptId: quizState?.attemptId || null,
    enabled: !!quizState
  })

  const handleRestart = useCallback(async (reason: string) => {
    if (!quizState) return

    try {
      const data = await restartAttempt(quizState.attemptId, reason)
      setQuizState({
        ...quizState,
        attemptId: data.attemptId,
        questionOrder: data.questionOrder,
        currentIndex: 0,
        answers: new Map(),
        startedAt: new Date(data.startedAt),
        timeLimitSec: data.timeLimitSec,
        timeRemaining: data.timeLimitSec
      })
    } catch (err) {
      console.error('Failed to restart:', err)
    }
  }, [quizState])

  const { requestFullscreen, exitFullscreen } = useQuizEnforcement({
    enabled: !!quizState,
    onRestart: handleRestart,
    onEvent: addEvent
  })

  // Initialize quiz
  useEffect(() => {
    if (!quizId) return
    initQuiz()
  }, [quizId])

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  const initQuiz = async () => {
    try {
      // Check for mobile phone first
      if (isMobilePhone()) {
        setIsMobile(true)
        setLoading(false)
        return
      }

      // Request fullscreen (skip for iOS as it doesn't support the Fullscreen API)
      if (!isIOS()) {
        const fullscreenGranted = await requestFullscreen()
        if (!fullscreenGranted) {
          setError('Fullscreen is required to take the quiz')
          setLoading(false)
          return
        }
      }

      // Get quiz data
      const quizData = await getQuiz(quizId!)

      // Start attempt
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      }
      const attemptData = await startAttempt(quizId!, deviceInfo)

      // Build question map
      const questionMap = new Map(quizData.questions.map(q => [q.id, q]))
      const orderedQuestions = attemptData.questionOrder
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined)

      setQuizState({
        attemptId: attemptData.attemptId,
        questions: orderedQuestions,
        questionOrder: attemptData.questionOrder,
        currentIndex: 0,
        answers: new Map(),
        startedAt: new Date(attemptData.startedAt),
        timeLimitSec: attemptData.timeLimitSec,
        timeRemaining: attemptData.timeLimitSec
      })

      addEvent({
        eventType: 'quiz_start',
        eventAt: new Date().toISOString(),
        payload: { attemptId: attemptData.attemptId }
      })

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz')
      setLoading(false)
    }
  }

  // Timer
  useEffect(() => {
    if (!quizState) return

    const interval = setInterval(() => {
      setQuizState(prev => {
        if (!prev) return null
        const newTime = prev.timeRemaining - 1
        if (newTime <= 0) {
          // Auto-submit
          handleSubmit()
          return prev
        }
        return { ...prev, timeRemaining: newTime }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [quizState?.attemptId])

  const currentQuestion = quizState?.questions[quizState.currentIndex]
  const currentAnswer = currentQuestion
    ? quizState?.answers.get(currentQuestion.id) || []
    : []

  const handleAnswerChange = async (optionIndex: number) => {
    if (!quizState || !currentQuestion) return

    let newSelected: number[]
    if (currentQuestion.qtype === 'single') {
      newSelected = [optionIndex]
    } else {
      // Multi-select toggle
      if (currentAnswer.includes(optionIndex)) {
        newSelected = currentAnswer.filter(i => i !== optionIndex)
      } else {
        newSelected = [...currentAnswer, optionIndex]
      }
    }

    const newAnswers = new Map(quizState.answers)
    newAnswers.set(currentQuestion.id, newSelected)
    setQuizState({ ...quizState, answers: newAnswers })

    // Save answer to server
    const timeSpent = Date.now() - questionStartTime.current
    try {
      await saveAnswer(quizState.attemptId, currentQuestion.id, newSelected, timeSpent)
    } catch (err) {
      console.error('Failed to save answer:', err)
    }

    addEvent({
      eventType: 'answer_change',
      eventAt: new Date().toISOString(),
      payload: { questionId: currentQuestion.id, selected: newSelected }
    })
  }

  const handleNext = () => {
    if (!quizState) return

    addEvent({
      eventType: 'next_click',
      eventAt: new Date().toISOString(),
      payload: { fromIndex: quizState.currentIndex }
    })

    if (quizState.currentIndex < quizState.questions.length - 1) {
      setQuizState({ ...quizState, currentIndex: quizState.currentIndex + 1 })
      questionStartTime.current = Date.now()

      addEvent({
        eventType: 'question_view',
        eventAt: new Date().toISOString(),
        payload: { questionIndex: quizState.currentIndex + 1 }
      })
    }
  }

  const handlePrev = () => {
    addEvent({
      eventType: 'prev_click',
      eventAt: new Date().toISOString()
    })
    setShowPrevConfirm(true)
  }

  const confirmPrevRestart = () => {
    addEvent({
      eventType: 'prev_confirm_restart',
      eventAt: new Date().toISOString()
    })
    setShowPrevConfirm(false)
    handleRestart('prev_navigation')
  }

  const handleSubmit = async () => {
    if (!quizState || submitting) return

    setSubmitting(true)
    await flushEvents()

    addEvent({
      eventType: 'submit',
      eventAt: new Date().toISOString()
    })

    try {
      await submitAttempt(quizState.attemptId)
      await exitFullscreen()
      navigate(`/result/${quizState.attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Starting quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to quizzes
          </button>
        </div>
      </div>
    )
  }

  if (!quizState || !currentQuestion) {
    return null
  }

  const isLastQuestion = quizState.currentIndex === quizState.questions.length - 1
  const progress = ((quizState.currentIndex + 1) / quizState.questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-900 text-white quiz-mode">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Question {quizState.currentIndex + 1} of {quizState.questions.length}
          </span>
          <span className={`text-sm px-2 py-1 rounded ${
            currentQuestion.qtype === 'multi' ? 'bg-purple-600' : 'bg-blue-600'
          }`}>
            {currentQuestion.qtype === 'multi' ? 'Multiple Select' : 'Single Select'}
          </span>
        </div>
        <div className={`text-lg font-mono ${
          quizState.timeRemaining < 60 ? 'text-red-400' : ''
        }`}>
          {formatTime(quizState.timeRemaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-700">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl mb-8">{currentQuestion.prompt}</h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerChange(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                currentAnswer.includes(index)
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  currentAnswer.includes(index)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-500'
                }`}>
                  {currentAnswer.includes(index) && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex justify-between">
          <button
            onClick={handlePrev}
            disabled={quizState.currentIndex === 0}
            className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Previous confirmation modal */}
      {showPrevConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Restart Quiz?</h3>
            <p className="text-gray-300 mb-6">
              Going back to a previous question will restart the quiz with reshuffled questions and a new timer. Are you sure?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowPrevConfirm(false)}
                className="flex-1 py-2 bg-gray-600 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrevRestart}
                className="flex-1 py-2 bg-red-600 rounded-lg hover:bg-red-500"
              >
                Restart Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
