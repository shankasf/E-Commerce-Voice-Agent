import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || '/api'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Metrics
export async function getMetrics(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return apiRequest<MetricsResponse>(`/admin/metrics?${params}`)
}

// Attempts
export async function getAttempts(filters: AttemptFilters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value))
  })
  return apiRequest<AttemptsResponse>(`/admin/attempts?${params}`)
}

export async function getAttemptDetail(id: string) {
  return apiRequest<AttemptDetailResponse>(`/admin/attempts/${id}`)
}

// Quizzes
export async function getQuizzes() {
  return apiRequest<{ quizzes: Quiz[] }>('/admin/quizzes')
}

export async function createQuiz(data: CreateQuizData) {
  return apiRequest<{ quiz: Quiz }>('/admin/quizzes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateQuiz(id: string, data: Partial<CreateQuizData>) {
  return apiRequest<{ quiz: Quiz }>(`/admin/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteQuiz(id: string) {
  return apiRequest<{ success: boolean }>(`/admin/quizzes/${id}`, {
    method: 'DELETE'
  })
}

// Questions
export async function getQuestions(quizId: string) {
  return apiRequest<{ questions: Question[] }>(`/admin/quizzes/${quizId}/questions`)
}

export async function createQuestion(quizId: string, data: CreateQuestionData) {
  return apiRequest<{ question: Question }>(`/admin/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateQuestion(id: string, data: Partial<CreateQuestionData>) {
  return apiRequest<{ question: Question }>(`/admin/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteQuestion(id: string) {
  return apiRequest<{ success: boolean }>(`/admin/questions/${id}`, {
    method: 'DELETE'
  })
}

// Imports
export async function getImports() {
  return apiRequest<{ imports: Import[] }>('/admin/imports')
}

export async function createImport(quizId: string | null, fileType: 'csv' | 'pdf') {
  return apiRequest<CreateImportResponse>('/admin/imports/create', {
    method: 'POST',
    body: JSON.stringify({ quizId, fileType })
  })
}

export async function processImport(id: string) {
  return apiRequest<{ success: boolean; questionsCreated: number }>(`/admin/imports/${id}/process`, {
    method: 'POST'
  })
}

// Export
export function getExportUrl(quizId: string, format: 'csv' | 'pdf') {
  return `${API_URL}/admin/quizzes/${quizId}/export.${format}`
}

// Types
export interface MetricsResponse {
  period: { from: string; to: string }
  metrics: {
    totalAttempts: number
    submittedAttempts: number
    passedAttempts: number
    passRate: number
    averageScore: number
    activeQuizzes: number
    totalUsers: number
  }
}

export interface AttemptFilters {
  status?: string
  quizId?: string
  userId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AttemptsResponse {
  attempts: AttemptSummary[]
  total: number
  page: number
  limit: number
}

export interface AttemptSummary {
  id: string
  quizId: string
  quizTitle: string
  userId: string
  userName: string
  userEmail: string
  attemptNo: number
  status: string
  startedAt: string
  endedAt: string | null
  scorePercent: number | null
  pass: boolean | null
  restartCount: number
  totalQuestions: number
  timeLimitSec: number
  ip: string | null
  deviceInfo: Record<string, unknown> | null
}

export interface AttemptDetailResponse {
  attempt: AttemptSummary & {
    passingPercent: number
    totalQuestions: number
    correctAnswers: number
    restartReasonLast: string | null
    userAgent: string | null
  }
  answers: AnswerDetail[]
  events: EventDetail[]
}

export interface AnswerDetail {
  questionId: string
  prompt: string
  options: string[]
  selected: number[]
  correct: number[]
  explanation: string | null
  timeSpentMs: number | null
}

export interface EventDetail {
  id: string
  event_type: string
  event_at: string
  payload: Record<string, unknown> | null
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  passing_percent: number
  time_per_question_sec: number
  buffer_sec: number
  is_active: boolean
  created_at: string
  questionCount: number
}

export interface CreateQuizData {
  title: string
  description?: string
  passingPercent?: number
  timePerQuestionSec?: number
  bufferSec?: number
  isActive?: boolean
}

export interface Question {
  id: string
  quiz_id: string
  qtype: 'single' | 'multi'
  prompt: string
  options: string[]
  correct: number[]
  explanation: string | null
  tags: string[] | null
  created_at: string
}

export interface CreateQuestionData {
  qtype: 'single' | 'multi'
  prompt: string
  options: string[]
  correct: number[]
  explanation?: string
  tags?: string[]
}

export interface Import {
  id: string
  quiz_id: string | null
  file_path: string
  file_type: 'csv' | 'pdf'
  status: string
  result_summary: Record<string, unknown> | null
  created_at: string
  quizzes?: { title: string } | null
  profiles?: { name: string; email: string } | null
}

export interface CreateImportResponse {
  importId: string
  signedUploadUrl: string
  token: string
  path: string
}
