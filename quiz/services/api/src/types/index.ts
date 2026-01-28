export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_percent: number;
  time_per_question_sec: number;
  buffer_sec: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  qtype: 'single' | 'multi';
  prompt: string;
  options: string[];
  correct: number[];
  explanation: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_no: number;
  status: 'in_progress' | 'submitted' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  total_questions: number;
  time_limit_sec: number;
  shuffle_seed: string;
  restart_count: number;
  restart_reason_last: string | null;
  score_percent: number | null;
  pass: boolean | null;
  device_info: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected: number[];
  time_spent_ms: number | null;
  changed_at: string;
}

export interface AttemptEvent {
  id: string;
  attempt_id: string;
  user_id: string;
  event_type: string;
  event_at: string;
  payload: Record<string, unknown> | null;
}

export interface Import {
  id: string;
  quiz_id: string | null;
  uploaded_by: string;
  file_path: string;
  file_type: 'csv' | 'pdf';
  status: 'queued' | 'processing' | 'done' | 'failed';
  result_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}
