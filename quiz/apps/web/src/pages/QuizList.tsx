import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getQuizzes, Quiz } from '../lib/api'

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      const data = await getQuizzes()
      setQuizzes(data.quizzes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Available Quizzes</h1>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <span className="text-sm sm:text-base text-gray-600 truncate max-w-[180px] sm:max-w-none">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-base sm:text-lg">No quizzes available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {quiz.title}
                  </h2>
                  {quiz.description && (
                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{quiz.description}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-gray-500 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-semibold text-gray-900">{quiz.question_count}</div>
                      <div>Questions</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-semibold text-gray-900">{formatTime(quiz.time_limit_sec)}</div>
                      <div>Duration</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-semibold text-gray-900">{quiz.passing_percent}%</div>
                      <div>To Pass</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/quiz/${quiz.id}/rules`)}
                    className="w-full bg-blue-600 text-white py-2.5 sm:py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
