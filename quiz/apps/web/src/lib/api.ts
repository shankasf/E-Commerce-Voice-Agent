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

// Quiz endpoints
export async function getQuizzes() {
  return apiRequest<{ quizzes: Quiz[] }>('/quizzes')
}

export async function getQuiz(quizId: string) {
  return apiRequest<{ quiz: Quiz; questions: Question[] }>(`/quizzes/${quizId}`)
}

// Attempt endpoints
export async function startAttempt(quizId: string, deviceInfo: Record<string, unknown>) {
  return apiRequest<StartAttemptResponse>('/attempts/start', {
    method: 'POST',
    body: JSON.stringify({ quizId, deviceInfo })
  })
}

export async function restartAttempt(attemptId: string, reason: string) {
  return apiRequest<StartAttemptResponse>('/attempts/restart', {
    method: 'POST',
    body: JSON.stringify({ attemptId, reason })
  })
}

export async function submitAttempt(attemptId: string) {
  return apiRequest<SubmitAttemptResponse>('/attempts/submit', {
    method: 'POST',
    body: JSON.stringify({ attemptId })
  })
}

export async function getAttempt(attemptId: string) {
  return apiRequest<{ attempt: Attempt; answers: Answer[] }>(`/attempts/${attemptId}`)
}

// Answer endpoints
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selected: number[],
  timeSpentMs: number
) {
  return apiRequest<{ success: boolean }>('/answers/upsert', {
    method: 'POST',
    body: JSON.stringify({ attemptId, questionId, selected, timeSpentMs })
  })
}

// Event endpoints
export async function logEvents(attemptId: string, events: EventPayload[]) {
  return apiRequest<{ success: boolean; count: number }>('/events/batch', {
    method: 'POST',
    body: JSON.stringify({ attemptId, events })
  })
}

// Types
export interface Quiz {
  id: string
  title: string
  description: string | null
  passing_percent: number
  time_per_question_sec: number
  buffer_sec: number
  question_count: number
  time_limit_sec: number
}

export interface Question {
  id: string
  qtype: 'single' | 'multi'
  prompt: string
  options: string[]
}

export interface StartAttemptResponse {
  attemptId: string
  attemptNo: number
  timeLimitSec: number
  questionOrder: string[]
  shuffleSeed: string
  startedAt: string
  restartCount?: number
}

export interface SubmitAttemptResponse {
  score: number
  totalCorrect: number
  totalQuestions: number
  pass: boolean
  passingPercent: number
}

export interface Attempt {
  id: string
  quizId: string
  quizTitle: string
  status: 'in_progress' | 'submitted' | 'abandoned'
  startedAt: string
  endedAt: string | null
  timeLimitSec: number
  shuffleSeed: string
  scorePercent: number | null
  pass: boolean | null
  passingPercent: number
}

export interface Answer {
  question_id: string
  selected: number[]
}

export interface EventPayload {
  eventType: string
  eventAt: string
  payload?: Record<string, unknown>
}
