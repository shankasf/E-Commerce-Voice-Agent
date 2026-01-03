// AI Resolution API Route
// Uses modular multi-agent system for ticket resolution

import { NextRequest, NextResponse } from 'next/server';
import {
  AGENT_DEFINITIONS,
  getAgentName,
  createResponse,
  DEFAULT_MODEL,
  getOrCreateAIBot,
  handoffToAgent,
  needsMultiAgentSupport,
  multiAgentAnalysis,
  buildTicketContext,
  supabase,
  AI_BOT_AGENTS,
  AgentType,
  TriageResult,
  SatisfactionResult,
} from '@/lib/ai-agents';

// Detect user intent using Responses API (JSON output)
async function detectUserIntent(userMessage: string, conversationHistory: string): Promise<{
  tool: string;
  args: any;
}> {
  const systemPrompt = `You are an intent detection system for IT support. Analyze the user's message and determine their intent.

IMPORTANT RULES:
1. If user wants to talk to a human, escalate, transfer, handoff, speak to a real person, or anything similar - use handoff_to_human_agent
2. If user EXPLICITLY asks to close the ticket (using words like "close", "close it", "close the ticket") - use close_ticket
3. For everything else (describing issues, asking questions, confirming steps, saying "it worked", etc.) - use continue_troubleshooting

DO NOT use close_ticket just because user says "thanks" or "it worked" - they must specifically ask to CLOSE the ticket.
DO use handoff_to_human_agent for ANY request to speak with a human, regardless of exact wording.

Set confirmed=true for handoff_to_human_agent if:
- User says "now", "immediately", "just do it", "right now"
- User is confirming after being asked "would you like me to proceed?"
- User simply says "yes", "yeah", "sure", "go ahead" after a handoff was offered`;

  const intentSchema = `Return STRICT JSON only, with this exact shape:
{ "tool": "handoff_to_human_agent" | "close_ticket" | "continue_troubleshooting", "args": { ... } }

Args rules:
- tool=handoff_to_human_agent => args: { "reason": string, "confirmed": boolean }
- tool=close_ticket => args: { "resolution_summary": string }
- tool=continue_troubleshooting => args: { "response_type": "greeting" | "troubleshooting" | "follow_up" | "clarification" | "acknowledgment" }`;

  try {
    const { output_text } = await createResponse({
      model: DEFAULT_MODEL,
      instructions: `${systemPrompt}\n\n${intentSchema}`,
      input: `Conversation so far:\n${conversationHistory}\n\nUser's latest message: "${userMessage}"`,
      temperature: 0.1,
      text: { format: { type: 'json_object' } },
      max_output_tokens: 220,
    });

    const parsed = JSON.parse(output_text || '{}');
    if (parsed?.tool && parsed?.args) {
      return { tool: parsed.tool, args: parsed.args };
    }

    return { tool: 'continue_troubleshooting', args: { response_type: 'troubleshooting' } };
  } catch (error) {
    console.error('Intent detection error:', error);
    return { tool: 'continue_troubleshooting', args: { response_type: 'troubleshooting' } };
  }
}

// Clean all internal markers from AI response before showing to user
function cleanResponse(text: string): string {
  return text
    .replace(/ESCALATE_TO_HUMAN/g, '')
    .replace(/HANDOFF_TO:\w+/g, '')
    .replace(/CLOSE_TICKET_CONFIRMED/g, '')
    .replace(/\n{3,}/g, '\n\n')  // Remove excessive newlines
    .trim();
}

// Triage ticket to determine category and urgency
async function triageTicket(subject: string, description: string): Promise<TriageResult> {
  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Analyze this ticket and respond in json format.\n\nSubject: ${subject}\n\nDescription: ${description}`,
    instructions: AGENT_DEFINITIONS.triage.systemPrompt,
    temperature: 0.3,
    text: { format: { type: 'json_object' } },
  });

  try {
    return JSON.parse(output_text || '{}');
  } catch {
    return { category: 'general', urgency: 'medium', initialSteps: [] };
  }
}

// Generate solution with full context and multi-agent support
async function generateSolution(category: string, ticket: any, conversationHistory: string): Promise<string> {
  const agentDef = AGENT_DEFINITIONS[category as AgentType] || AGENT_DEFINITIONS.general;
  
  // Build full context from database
  const customerContext = await buildTicketContext(ticket);
  
  // Check if this is a multi-domain issue that needs collaboration
  let multiAgentInput = '';
  if (needsMultiAgentSupport(ticket.subject, ticket.description || '')) {
    const collaboration = await multiAgentAnalysis(
      `${ticket.subject}: ${ticket.description}`,
      customerContext
    );
    
    if (collaboration.recommendations.length > 0) {
      multiAgentInput = `\n\nMULTI-AGENT CONSULTATION:\nOther specialists have provided input:\n${collaboration.recommendations.join('\n')}\n\nUse this advice to provide comprehensive support.`;
    }
    
    if (collaboration.suggestedAgent !== category && collaboration.suggestedAgent !== 'general') {
      multiAgentInput += `\n\nNote: This issue may benefit from handoff to ${collaboration.suggestedAgent} specialist if your troubleshooting doesn't resolve it.`;
    }
  }
  
  const instructions = agentDef.systemPrompt + `

DATABASE ACCESS:
You have access to the following customer information:
${customerContext}
${multiAgentInput}

Use this information to provide personalized support. Reference their devices, previous tickets, or organization when relevant.

RESPONSE STYLE (CRITICAL - FOLLOW STRICTLY):
- Keep ALL responses to 2-3 lines maximum
- Be conversational, like texting a helpful colleague
- NO bullet points, NO numbered lists, NO step-by-step formatting
- ONE thought per message, then wait for response
- Use simple, natural language

EXAMPLE GOOD RESPONSES:
- "Got it, let's check your internet. Can you try restarting your router? Just unplug it for 30 seconds and plug it back in."
- "Sounds like a connection issue. Are you on WiFi or connected with a cable?"
- "Let me look into that for you. Is this happening on just your computer or other devices too?"

EXAMPLE BAD RESPONSES (NEVER DO THIS):
- Long paragraphs with multiple steps
- Numbered steps like "Step 1: ... Step 2: ..."
- Bullet point lists
- Formal language like "I apologize for the inconvenience"

CONVERSATION FLOW:
1. Ask ONE clarifying question if needed
2. Give ONE simple instruction
3. Wait for user to respond before continuing
4. Keep the back-and-forth natural

WHEN USER SAYS IT'S FIXED:
- Just say: "Glad that worked! Should I close this ticket for you?"
- Wait for their response

WHEN USER WANTS HUMAN HELP:
- The system handles this automatically - don't interfere
- Don't ask for device details when user wants transfer

INTERNAL MARKERS (place at END of message only):
- ESCALATE_TO_HUMAN: ONLY for critical issues (security breach, office-wide outage)
- CLOSE_TICKET_CONFIRMED: ONLY when user explicitly says "close", "yes close it"
- HANDOFF_TO:[agent_type]: When issue needs different specialist`;

  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Ticket Subject: ${ticket.subject}\n\nDescription: ${ticket.description || ''}\n\nConversation so far:\n${conversationHistory}`,
    instructions,
    temperature: 0.5,
    max_output_tokens: 200,
  });

  return output_text || 'I apologize, but I encountered an issue generating a response. Let me escalate this to a human agent.';
}

// Check user satisfaction and intent
async function checkSatisfaction(message: string): Promise<SatisfactionResult> {
  const instructions = `Analyze if the user's message indicates satisfaction, desire to close ticket, or need for human help.
Respond with JSON: { "satisfied": boolean, "shouldClose": boolean, "wantsHuman": boolean, "reason": string }

IMPORTANT RULES:
- satisfied: true ONLY if user explicitly says the problem is fixed/resolved/working now (e.g., "it worked", "fixed", "problem solved", "that resolved it")
- shouldClose: true ONLY if user EXPLICITLY asks to close the ticket. They must use words like "close", "close it", "yes close", "please close the ticket", "go ahead and close". 
  CRITICAL: "yes it worked" or "it's fixed" does NOT mean shouldClose=true. The user must specifically mention CLOSING the ticket.
  Examples where shouldClose=FALSE: "yes it worked", "thanks that fixed it", "problem solved", "it's working now"
  Examples where shouldClose=TRUE: "yes close it", "please close the ticket", "go ahead and close", "yes you can close it"
- wantsHuman: true if user asks for human, technician, real person, escalate, live agent, etc.
- confirmsHumanHandoff: true ONLY if the previous message asked about human agent and user confirms (yes, please, sure, go ahead)

Be VERY strict about shouldClose - it requires explicit mention of closing the ticket.`;

  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Analyze this user message and respond in json format: "${message}"`,
    instructions,
    temperature: 0.1,
    text: { format: { type: 'json_object' } },
  });

  try {
    const result = JSON.parse(output_text || '{}');
    
    // Extra safeguard: only allow shouldClose if the message actually contains close-related words
    const lowerMessage = message.toLowerCase();
    const hasCloseIntent = lowerMessage.includes('close') || 
                           lowerMessage.includes('shut') || 
                           lowerMessage.includes('end ticket') ||
                           lowerMessage.includes('mark as resolved');
    
    // Check for human handoff confirmation
    const hasHumanConfirm = lowerMessage.match(/\b(yes|yeah|sure|please|go ahead|ok|okay|confirm)\b/);
    
    return { 
      satisfied: result.satisfied || false, 
      shouldClose: hasCloseIntent && (result.shouldClose || false),
      wantsHuman: result.wantsHuman || false,
      confirmsHumanHandoff: hasHumanConfirm ? true : false
    };
  } catch {
    return { satisfied: false, shouldClose: false, wantsHuman: false, confirmsHumanHandoff: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticketId, userMessage } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        contact:contact_id(full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('*, sender_agent:sender_agent_id(full_name, agent_type), sender_contact:sender_contact_id(full_name)')
      .eq('ticket_id', ticketId)
      .order('message_time', { ascending: true });

    const conversationHistory = (messages || [])
      .map(m => `${m.sender_agent?.full_name || m.sender_contact?.full_name || 'Unknown'}: ${m.content}`)
      .join('\n');

    if (action === 'assign') {
      // Check if ticket is from a datacenter location - skip AI and assign human directly
      if (ticket.location_id) {
        const { data: location } = await supabase
          .from('locations')
          .select('*')
          .eq('location_id', ticket.location_id)
          .single();
        
        if (location?.location_type === 'Data Center' || location?.requires_human_agent) {
          // Get a random available human agent
          const { data: humanAgents } = await supabase
            .from('support_agents')
            .select('*')
            .eq('agent_type', 'Human')
            .eq('is_available', true);
          
          if (humanAgents && humanAgents.length > 0) {
            const randomAgent = humanAgents[Math.floor(Math.random() * humanAgents.length)];
            
            await supabase.from('ticket_assignments').insert({
              ticket_id: ticketId,
              support_agent_id: randomAgent.support_agent_id,
              is_primary: true,
            });

            await supabase.from('support_tickets').update({
              status_id: 2,
              requires_human_agent: true,
              updated_at: new Date().toISOString(),
            }).eq('ticket_id', ticketId);

            await supabase.from('ticket_messages').insert({
              ticket_id: ticketId,
              sender_agent_id: randomAgent.support_agent_id,
              content: `👋 Hello! This ticket is from a datacenter location and requires specialized human support.\n\nI'm ${randomAgent.full_name} and I'll be handling your case. I'm reviewing your issue now and will respond shortly.\n\nThank you for your patience!`,
              message_type: 'text',
            });

            return NextResponse.json({
              success: true,
              action: 'human_assigned',
              agentId: randomAgent.support_agent_id,
              agentName: randomAgent.full_name,
              message: 'Datacenter ticket assigned to human agent',
            });
          }
        }
      }

      // Triage the ticket to determine category
      const triage = await triageTicket(ticket.subject, ticket.description || '');
      
      // Get or create appropriate AI bot
      const botId = await getOrCreateAIBot(triage.category);
      
      // Assign bot to ticket
      await supabase.from('ticket_assignments').insert({
        ticket_id: ticketId,
        support_agent_id: botId,
        is_primary: true,
      });

      // Update ticket status to In Progress
      await supabase.from('support_tickets').update({
        status_id: 2,
        updated_at: new Date().toISOString(),
      }).eq('ticket_id', ticketId);

      // Build customer context for greeting
      const customerContext = await buildTicketContext(ticket);
      
      // Extract org name and manager from context
      const orgMatch = customerContext.match(/Organization: (.+)/);
      const managerMatch = customerContext.match(/Account Manager: (.+)/);
      
      const orgName = orgMatch ? orgMatch[1].trim() : 'your organization';
      const managerName = managerMatch ? managerMatch[1].trim() : null;
      
      // Build simple greeting - org name, manager, and "how can I assist you?"
      let greeting = `🤖 Hello! I'm the AI ${getAgentName(triage.category)}.\n\n`;
      greeting += `✅ Organization verified: **${orgName}**\n`;
      if (managerName) {
        greeting += `👤 Your Account Manager: **${managerName}**\n`;
      }
      greeting += `\nHow can I assist you today?`;

      // Add initial bot message - just greeting, no troubleshooting yet
      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_agent_id: botId,
        content: greeting,
        message_type: 'text',
      });

      return NextResponse.json({
        success: true,
        category: triage.category,
        botId,
        initialResponse: greeting,
      });

    } else if (action === 'respond') {
      if (!userMessage) {
        return NextResponse.json({ error: 'User message is required' }, { status: 400 });
      }

      // Get assigned bot
      const { data: assignment } = await supabase
        .from('ticket_assignments')
        .select('support_agent_id, support_agents(agent_type, specialization)')
        .eq('ticket_id', ticketId)
        .single();

      const botId = assignment?.support_agent_id || AI_BOT_AGENTS.GENERAL;
      const category = (assignment?.support_agents as any)?.specialization?.toLowerCase().split(' ')[0] || 'general';

      // Use LLM to detect user intent with tool calling
      const intent = await detectUserIntent(userMessage, conversationHistory);
      console.log('[AI Intent Detection]', { userMessage, intent });

      // Handle handoff_to_human_agent tool call
      if (intent.tool === 'handoff_to_human_agent') {
        const { confirmed } = intent.args;

        // If not confirmed, ask for confirmation
        if (!confirmed) {
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: `I'll transfer you to a human technician.\n\n**Would you like me to proceed?** Just say "yes" to confirm.`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'awaiting_human_confirmation',
            message: 'Asked user to confirm human handoff',
          });
        }

        // User confirmed - DO THE TRANSFER NOW
        const { data: humanAgents } = await supabase
          .from('support_agents')
          .select('*')
          .eq('agent_type', 'Human')
          .eq('is_available', true);
        
        if (humanAgents && humanAgents.length > 0) {
          const randomAgent = humanAgents[Math.floor(Math.random() * humanAgents.length)];
          
          // End bot assignment
          await supabase.from('ticket_assignments')
            .update({ is_primary: false, assignment_end: new Date().toISOString() })
            .eq('ticket_id', ticketId)
            .eq('support_agent_id', botId);
          
          // Assign human agent
          await supabase.from('ticket_assignments').insert({
            ticket_id: ticketId,
            support_agent_id: randomAgent.support_agent_id,
            is_primary: true,
          });

          // Update ticket status
          await supabase.from('support_tickets').update({
            status_id: 4,
            requires_human_agent: true,
            updated_at: new Date().toISOString(),
          }).eq('ticket_id', ticketId);

          // Bot farewell message
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: `✅ I'm transferring you to a human technician now. Thank you for your patience!`,
            message_type: 'text',
          });

          // Human agent introduction
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: randomAgent.support_agent_id,
            content: `👋 Hello! I'm ${randomAgent.full_name}, a human technician. I've been assigned to your ticket and have reviewed your conversation.\n\nI'm here to help! Please give me a moment to look over the details, and I'll respond shortly.`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'transferred_to_human',
            agentId: randomAgent.support_agent_id,
            agentName: randomAgent.full_name,
          });
        } else {
          // No human agents available
          await supabase.from('support_tickets').update({
            status_id: 4,
            requires_human_agent: true,
            updated_at: new Date().toISOString(),
          }).eq('ticket_id', ticketId);

          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: `I've marked your ticket for human support. All our technicians are currently busy, but someone will be assigned to your ticket as soon as they're available.\n\nYour ticket is now in the queue for human review. Thank you for your patience!`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'queued_for_human',
            message: 'No human agents available, ticket queued',
          });
        }
      }

      // Handle close_ticket tool call
      if (intent.tool === 'close_ticket') {
        await supabase.from('support_tickets').update({
          status_id: 5,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('ticket_id', ticketId);

        await supabase.from('ticket_messages').insert({
          ticket_id: ticketId,
          sender_agent_id: botId,
          content: `✅ Your ticket has been closed. Thank you for confirming the resolution!\n\n🎉 I'm glad I could help. If you have any other IT issues in the future, don't hesitate to open a new ticket.\n\nHave a great day!`,
          message_type: 'text',
        });

        return NextResponse.json({
          success: true,
          action: 'closed',
          message: 'Ticket resolved and closed',
        });
      }

      // Handle continue_troubleshooting - generate AI response
      // Generate next step response with full database context
      const response = await generateSolution(
        category,
        ticket,
        conversationHistory + `\nUser: ${userMessage}`
      );

      // Check for agent handoff request
      const handoffMatch = response.match(/HANDOFF_TO:(\w+)/);
      if (handoffMatch) {
        const targetAgent = handoffMatch[1].toLowerCase();
        const handoffClean = cleanResponse(response);
        
        const handoff = await handoffToAgent(ticketId, botId, targetAgent, `Issue requires ${targetAgent} specialist`);
        
        if (handoff.success) {
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: handoffClean + `\n\n🔄 I'm transferring you to our ${getAgentName(targetAgent)} who can better assist with this aspect of your issue.`,
            message_type: 'text',
          });

          const newAgentResponse = await generateSolution(
            targetAgent,
            ticket,
            conversationHistory + `\nUser: ${userMessage}\nPrevious Agent: ${handoffClean}`
          );

          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: handoff.newAgentId,
            content: cleanResponse(`👋 Hello! I'm the AI ${getAgentName(targetAgent)}. I've reviewed your conversation and I'm ready to help.\n\n${newAgentResponse}`),
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'handoff',
            newAgent: targetAgent,
            response: cleanResponse(newAgentResponse),
          });
        }
      }

      // Check for escalation trigger - actually assign a human agent
      if (response.includes('ESCALATE_TO_HUMAN')) {
        // Get a random available human agent
        const { data: humanAgents } = await supabase
          .from('support_agents')
          .select('*')
          .eq('agent_type', 'Human')
          .eq('is_available', true);
        
        if (humanAgents && humanAgents.length > 0) {
          const randomAgent = humanAgents[Math.floor(Math.random() * humanAgents.length)];
          
          // Update assignment to human agent
          await supabase.from('ticket_assignments')
            .update({ is_primary: false, assignment_end: new Date().toISOString() })
            .eq('ticket_id', ticketId)
            .eq('support_agent_id', botId);
          
          await supabase.from('ticket_assignments').insert({
            ticket_id: ticketId,
            support_agent_id: randomAgent.support_agent_id,
            is_primary: true,
          });

          await supabase.from('support_tickets').update({
            status_id: 4,
            requires_human_agent: true,
            updated_at: new Date().toISOString(),
          }).eq('ticket_id', ticketId);

          const escalateClean = cleanResponse(response);
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: escalateClean,
            message_type: 'text',
          });

          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: randomAgent.support_agent_id,
            content: `👋 Hello! I'm ${randomAgent.full_name}, a human technician. I've reviewed your conversation and I'm taking over from here.\n\nPlease give me a moment to review the details, and I'll respond shortly.`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'human_handoff',
            agentId: randomAgent.support_agent_id,
            agentName: randomAgent.full_name,
          });
        } else {
          // No human agents available, just mark as escalated
          await supabase.from('support_tickets').update({
            status_id: 4,
            requires_human_agent: true,
            updated_at: new Date().toISOString(),
          }).eq('ticket_id', ticketId);

          const escalateClean = cleanResponse(response);
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: escalateClean + `\n\n⚠️ I've escalated your ticket for human review. A technician will be assigned shortly.`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'escalated',
            response: escalateClean,
          });
        }
      }

      // Check for close confirmation - with safeguard validation
      if (response.includes('CLOSE_TICKET_CONFIRMED')) {
        // SAFEGUARD: Only allow close if:
        // 1. Previous bot message asked about closing
        // 2. User's current message explicitly confirms closing
        const lastBotMessage = (messages || [])
          .filter((m: any) => m.sender_agent_id)
          .pop();
        
        const botAskedToClose = lastBotMessage?.content?.toLowerCase().includes('close this ticket') ||
                                 lastBotMessage?.content?.toLowerCase().includes('close the ticket');
        
        const userConfirmsClose = userMessage.toLowerCase().match(/\b(yes|yeah|sure|please|go ahead|close|ok|okay)\b/);
        
        if (!botAskedToClose || !userConfirmsClose) {
          // AI hallucinated - don't close, just ask properly
          const safeResponse = cleanResponse(response) + 
            '\n\nWould you like me to close this ticket?';
          
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: safeResponse,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            response: safeResponse,
          });
        }
        
        // Valid close confirmation
        await supabase.from('support_tickets').update({
          status_id: 5,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('ticket_id', ticketId);

        const cleaned = cleanResponse(response);
        await supabase.from('ticket_messages').insert({
          ticket_id: ticketId,
          sender_agent_id: botId,
          content: cleaned,
          message_type: 'text',
        });

        return NextResponse.json({
          success: true,
          action: 'closed',
          response: cleaned,
        });
      }

      // Add bot response - clean all internal markers
      const finalResponse = cleanResponse(response);
      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_agent_id: botId,
        content: finalResponse,
        message_type: 'text',
      });

      // Update ticket status
      await supabase.from('support_tickets').update({
        status_id: 3,
        updated_at: new Date().toISOString(),
      }).eq('ticket_id', ticketId);

      return NextResponse.json({
        success: true,
        response: finalResponse,
      });

    } else if (action === 'escalate') {
      await supabase.from('support_tickets').update({
        status_id: 4,
        requires_human_agent: true,
        updated_at: new Date().toISOString(),
      }).eq('ticket_id', ticketId);

      const { data: assignment } = await supabase
        .from('ticket_assignments')
        .select('support_agent_id')
        .eq('ticket_id', ticketId)
        .single();

      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_agent_id: assignment?.support_agent_id || 1,
        content: `⚠️ This ticket has been escalated to a human agent for further assistance. A technician will review your case and respond shortly.\n\nThank you for your patience.`,
        message_type: 'text',
      });

      return NextResponse.json({
        success: true,
        action: 'escalated',
        message: 'Ticket escalated to human agent',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('AI Resolution error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check AI bot status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticketId');

  if (!ticketId) {
    return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
  }

  const { data: assignment } = await supabase
    .from('ticket_assignments')
    .select(`
      *,
      agent:support_agent_id(full_name, agent_type, specialization)
    `)
    .eq('ticket_id', parseInt(ticketId))
    .single();

  const hasAIBot = assignment?.agent?.agent_type === 'Bot';

  return NextResponse.json({
    ticketId: parseInt(ticketId),
    hasAIBot,
    botDetails: hasAIBot ? assignment.agent : null,
  });
}
