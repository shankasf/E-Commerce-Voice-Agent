// Agent Registry - Central export for all AI agents

import { AgentDefinition, AgentType } from './types';
import { triageAgent } from './triage-agent';
import { emailAgent } from './email-agent';
import { networkAgent } from './network-agent';
import { computerAgent } from './computer-agent';
import { printerAgent } from './printer-agent';
import { phoneAgent } from './phone-agent';
import { securityAgent } from './security-agent';
import { generalAgent } from './general-agent';

// All agent definitions
export const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  triage: triageAgent,
  email: emailAgent,
  network: networkAgent,
  computer: computerAgent,
  printer: printerAgent,
  phone: phoneAgent,
  security: securityAgent,
  general: generalAgent,
};

// Get agent by type
export function getAgent(type: AgentType): AgentDefinition {
  return AGENT_DEFINITIONS[type] || AGENT_DEFINITIONS.general;
}

// Get agent name by type
export function getAgentName(type: string): string {
  const agent = AGENT_DEFINITIONS[type as AgentType];
  return agent?.name || 'IT Support Agent';
}

// Get agent name with AI prefix
export function getAIAgentName(type: string): string {
  const agent = AGENT_DEFINITIONS[type as AgentType];
  const baseName = agent?.name || 'IT Support Agent';
  return `AI ${baseName}`;
}

// List all available agents
export function listAgents(): { type: AgentType; name: string; description: string }[] {
  return Object.entries(AGENT_DEFINITIONS).map(([type, def]) => ({
    type: type as AgentType,
    name: def.name,
    description: def.description,
  }));
}

// Re-export types
export * from './types';

// Re-export individual agents
export { triageAgent } from './triage-agent';
export { emailAgent } from './email-agent';
export { networkAgent } from './network-agent';
export { computerAgent } from './computer-agent';
export { printerAgent } from './printer-agent';
export { phoneAgent } from './phone-agent';
export { securityAgent } from './security-agent';
export { generalAgent } from './general-agent';

// Re-export OpenAI client
export { createResponse, DEFAULT_MODEL } from './openai-client';

// Re-export orchestrator functions
export {
  consultAgent,
  multiAgentAnalysis,
  getOrCreateAIBot,
  handoffToAgent,
  needsMultiAgentSupport,
} from './orchestrator';

// Re-export database functions
export {
  getContactDetails,
  getOrganizationDetails,
  getDevicesForOrg,
  getLocationsForOrg,
  getTicketHistory,
  getTicketStatuses,
  getTicketPriorities,
  updateTicketPriority,
  addInternalNote,
  searchKnowledgeBase,
  buildTicketContext,
} from './database';
