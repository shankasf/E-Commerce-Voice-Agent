import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getQuizzes, createQuiz, deleteQuiz, updateQuiz, Quiz } from '../lib/api'

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createQuiz({ title: newTitle })
      setNewTitle('')
      setShowCreate(false)
      loadQuizzes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    try {
      await deleteQuiz(id)
      loadQuizzes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz')
    }
  }

  const handleToggleActive = async (quiz: Quiz) => {
    try {
      await updateQuiz(quiz.id, { isActive: !quiz.is_active })
      loadQuizzes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quiz status')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Quiz
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Quiz</h2>
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Quiz title"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass %</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                    {quiz.description && (
                      <div className="text-sm text-gray-500">{quiz.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {quiz.questionCount}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(quiz)}
                      className={`px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                        quiz.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      title={quiz.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {quiz.is_active ? 'Active' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {quiz.passing_percent}%
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <a
                      href={`/quiz/${quiz.id}/rules`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-900"
                    >
                      View
                    </a>
                    <Link
                      to={`/quizzes/${quiz.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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
