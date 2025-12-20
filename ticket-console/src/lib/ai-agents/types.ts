// AI Agent Types and Interfaces

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt: string;
}

export interface AgentConsultation {
  agentType: string;
  question: string;
  response: string;
}

export interface TriageResult {
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  initialSteps: string[];
  requiresEscalation?: boolean;
}

export interface SatisfactionResult {
  satisfied: boolean;
  shouldClose: boolean;
  wantsHuman: boolean;
  confirmsHumanHandoff: boolean;
}

export interface HandoffResult {
  success: boolean;
  newAgentId: number;
}

export interface MultiAgentAnalysis {
  recommendations: string[];
  suggestedAgent: string;
}

export interface ResponseParams {
  model: string;
  input: string | { role: string; content: string }[];
  instructions?: string;
  temperature?: number;
  max_output_tokens?: number;
  text?: { format: { type: string } };
  previous_response_id?: string;
}

export interface ResponseResult {
  output_text: string;
  id: string;
}

// AI Bot Agent IDs (these should match the support_agents table)
export const AI_BOT_AGENTS = {
  TRIAGE: 1,
  EMAIL: 10,
  NETWORK: 11,
  COMPUTER: 12,
  PRINTER: 13,
  SECURITY: 14,
  PHONE: 16,
  GENERAL: 15,
} as const;

export type AgentType = 'triage' | 'email' | 'network' | 'computer' | 'printer' | 'phone' | 'security' | 'general';
