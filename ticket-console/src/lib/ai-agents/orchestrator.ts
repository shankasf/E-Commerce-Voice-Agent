// Multi-Agent Orchestration System
// Enables agents to collaborate, consult each other, and hand off tickets

import { createClient } from '@supabase/supabase-js';
import { createResponse, DEFAULT_MODEL } from './openai-client';
import { AGENT_DEFINITIONS, getAgentName, AgentType, MultiAgentAnalysis, HandoffResult } from './index';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Consult another specialist agent for advice
export async function consultAgent(agentType: string, question: string, context: string): Promise<string> {
  const agentDef = AGENT_DEFINITIONS[agentType as AgentType];
  if (!agentDef) return 'Agent not found';

  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Context: ${context}\n\nQuestion from another agent: ${question}`,
    instructions: agentDef.systemPrompt + `\n\nYou are being consulted by another support agent. Provide expert advice based on your specialization. Be concise and actionable.`,
    temperature: 0.3,
    max_output_tokens: 500,
  });

  return output_text || 'Unable to provide consultation';
}

// Multi-agent collaboration - get input from multiple specialists
export async function multiAgentAnalysis(issue: string, context: string): Promise<MultiAgentAnalysis> {
  const analysisPrompt = `You are an IT support orchestrator. Analyze this issue and determine which specialist agents should be involved.

Issue: ${issue}

Available Specialist Agents:
- email: Outlook, email delivery, calendar, mail configuration
- network: Internet, VPN, WiFi, remote access, network drives
- computer: PC issues, software, performance, hardware, Windows/Mac
- printer: Printing, scanning, copier errors
- phone: VoIP, dial tone, voicemail, call quality
- security: Passwords, account lockouts, suspicious emails, security incidents
- general: Miscellaneous IT issues

Respond with JSON:
{
  "primaryAgent": "the main specialist to handle this",
  "consultAgents": ["list of agents to consult for additional input"],
  "reasoning": "why these agents",
  "isMultiDomain": boolean
}`;

  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Analyze this and respond in json format: ${analysisPrompt}\n\nContext: ${context}`,
    instructions: 'You are an IT support orchestrator that routes issues to the right specialist agents.',
    temperature: 0.2,
    text: { format: { type: 'json_object' } },
  });

  try {
    const analysis = JSON.parse(output_text || '{}');
    
    // If multi-domain issue, gather recommendations from each specialist
    const recommendations: string[] = [];
    if (analysis.isMultiDomain && analysis.consultAgents?.length > 0) {
      for (const agentType of analysis.consultAgents.slice(0, 3)) { // Max 3 consultations
        const advice = await consultAgent(agentType, issue, context);
        recommendations.push(`[${getAgentName(agentType)}]: ${advice}`);
      }
    }

    return {
      recommendations,
      suggestedAgent: analysis.primaryAgent || 'general',
    };
  } catch {
    return { recommendations: [], suggestedAgent: 'general' };
  }
}

// Get or create AI bot for a category
export async function getOrCreateAIBot(category: string): Promise<number> {
  // Check if bot exists
  const { data: existingBot } = await supabase
    .from('support_agents')
    .select('support_agent_id')
    .eq('agent_type', 'Bot')
    .ilike('specialization', `%${category}%`)
    .single();

  if (existingBot) {
    return existingBot.support_agent_id;
  }

  // Create new bot
  const agentDef = AGENT_DEFINITIONS[category as AgentType] || AGENT_DEFINITIONS.general;
  const { data: newBot, error } = await supabase
    .from('support_agents')
    .insert({
      full_name: agentDef.name,
      email: `${category}-bot@urackit.ai`,
      agent_type: 'Bot',
      specialization: agentDef.description,
      is_available: true,
    })
    .select()
    .single();

  if (error) throw error;
  return newBot.support_agent_id;
}

// Agent handoff - transfer ticket to a different specialist
export async function handoffToAgent(
  ticketId: number, 
  fromAgentId: number, 
  toAgentType: string, 
  reason: string
): Promise<HandoffResult> {
  // Get or create the target specialist bot
  const newAgentId = await getOrCreateAIBot(toAgentType);

  // Remove old assignment
  await supabase
    .from('ticket_assignments')
    .delete()
    .eq('ticket_id', ticketId)
    .eq('support_agent_id', fromAgentId);

  // Add new assignment
  await supabase.from('ticket_assignments').insert({
    ticket_id: ticketId,
    support_agent_id: newAgentId,
    is_primary: true,
  });

  // Add internal note about handoff
  await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_agent_id: fromAgentId,
    content: `🔄 [Internal] Ticket handed off to ${getAgentName(toAgentType)}. Reason: ${reason}`,
    message_type: 'internal_note',
  });

  return { success: true, newAgentId };
}

// Check if issue needs multi-agent collaboration
export function needsMultiAgentSupport(subject: string, description: string): boolean {
  const keywords = {
    multiDomain: ['and also', 'another issue', 'plus', 'additionally', 'as well as', 'on top of'],
    complex: ['tried everything', 'nothing works', 'multiple problems', 'several issues'],
  };

  const text = `${subject} ${description}`.toLowerCase();
  
  for (const group of Object.values(keywords)) {
    for (const keyword of group) {
      if (text.includes(keyword)) return true;
    }
  }
  
  return false;
}
