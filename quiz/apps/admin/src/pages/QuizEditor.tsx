import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getQuizzes, updateQuiz, getQuestions, createQuestion, deleteQuestion, Quiz, Question, getExportUrl } from '../lib/api'

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddQuestion, setShowAddQuestion] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [quizzesData, questionsData] = await Promise.all([
        getQuizzes(),
        getQuestions(id!)
      ])
      const foundQuiz = quizzesData.quizzes.find(q => q.id === id)
      setQuiz(foundQuiz || null)
      setQuestions(questionsData.questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!quiz) return
    try {
      await updateQuiz(quiz.id, { isActive: !quiz.is_active })
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quiz')
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    try {
      await deleteQuestion(questionId)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        Quiz not found
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/quizzes" className="text-blue-600 hover:text-blue-800">&larr; Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
        <span className={`px-2 py-1 text-xs rounded-full ${
          quiz.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {quiz.is_active ? 'Active' : 'Draft'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Quiz Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <div className="space-x-3">
            <button
              onClick={handleToggleActive}
              className={`px-4 py-2 rounded-md ${
                quiz.is_active
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {quiz.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <a
              href={getExportUrl(quiz.id, 'csv')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 inline-block"
              download
            >
              Export CSV
            </a>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Passing Score:</span>
            <span className="ml-2 font-medium">{quiz.passing_percent}%</span>
          </div>
          <div>
            <span className="text-gray-500">Time per Question:</span>
            <span className="ml-2 font-medium">{quiz.time_per_question_sec}s</span>
          </div>
          <div>
            <span className="text-gray-500">Buffer Time:</span>
            <span className="ml-2 font-medium">{quiz.buffer_sec}s</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
          <button
            onClick={() => setShowAddQuestion(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Question
          </button>
        </div>

        {showAddQuestion && (
          <QuestionForm
            quizId={quiz.id}
            onSave={() => { setShowAddQuestion(false); loadData(); }}
            onCancel={() => setShowAddQuestion(false)}
          />
        )}

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Q{index + 1}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    q.qtype === 'multi' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {q.qtype}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
              <p className="font-medium mb-2">{q.prompt}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded ${
                      q.correct.includes(i) ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuestionForm({ quizId, onSave, onCancel }: {
  quizId: string
  onSave: () => void
  onCancel: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [qtype, setQtype] = useState<'single' | 'multi'>('single')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createQuestion(quizId, {
        prompt,
        qtype,
        options: options.filter(o => o.trim()),
        correct
      })
      onSave()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4 bg-gray-50">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Question</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border rounded-md p-2"
            rows={2}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={qtype}
            onChange={(e) => { setQtype(e.target.value as 'single' | 'multi'); setCorrect([]); }}
            className="border rounded-md p-2"
          >
            <option value="single">Single Select</option>
            <option value="multi">Multi Select</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Options (mark correct)</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type={qtype === 'single' ? 'radio' : 'checkbox'}
                checked={correct.includes(i)}
                onChange={() => {
                  if (qtype === 'single') {
                    setCorrect([i])
                  } else {
                    setCorrect(correct.includes(i)
                      ? correct.filter(c => c !== i)
                      : [...correct, i])
                  }
                }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options]
                  newOpts[i] = e.target.value
                  setOptions(newOpts)
                }}
                className="flex-1 border rounded-md p-2"
                placeholder={`Option ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Question'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
