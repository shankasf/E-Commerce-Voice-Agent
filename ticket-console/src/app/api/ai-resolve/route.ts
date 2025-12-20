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

CONVERSATIONAL STYLE:
- Be friendly, warm, and conversational - like a helpful colleague
- Use the customer's name if available
- Show empathy and understanding
- Avoid robotic or overly formal language
- Make the interaction feel natural and human-like

MULTI-AGENT CAPABILITIES:
- You can suggest handing off to another specialist if the issue is outside your expertise
- If you detect an issue in another domain, include "HANDOFF_TO:[agent_type]" in your message (e.g., HANDOFF_TO:network)
- Available specialists: email, network, computer, printer, phone, security, general

CRITICAL INSTRUCTIONS FOR STEP-BY-STEP GUIDANCE:
1. Provide ONLY ONE troubleshooting step at a time
2. After giving a step, ask the user to try it and confirm if it worked
3. Wait for user confirmation before providing the next step
4. Keep steps simple and conversational
5. Use this format:
   "Let's try this step:
   
   **Step [N]:** [Clear instruction]
   
   Please try this and let me know:
   - Did this step work? Is your issue resolved?
   - Or should we continue to the next step?"

5. WHEN USER SAYS THE PROBLEM IS FIXED (e.g., "it worked", "fixed", "thanks that resolved it"):
   - DO NOT close the ticket yet
   - Simply ask: "Great! I'm glad that worked. Would you like me to close this ticket?"
   - STOP HERE and wait for their response

6. CLOSE_TICKET_CONFIRMED RULES (VERY IMPORTANT):
   - ONLY include "CLOSE_TICKET_CONFIRMED" if ALL of these are true:
     a) Your PREVIOUS message asked "Would you like me to close this ticket?"
     b) The user's CURRENT message explicitly says YES to closing (e.g., "yes", "yes close it", "please close", "go ahead")
   - NEVER include CLOSE_TICKET_CONFIRMED if user just says "it worked" or "thanks" or "fixed"
   - When in doubt, ask again: "Just to confirm, would you like me to close this ticket?"

7. ESCALATION RULES:
   - ONLY use "ESCALATE_TO_HUMAN" for CRITICAL issues like security incidents or office-wide outages
   - Do NOT use ESCALATE_TO_HUMAN when user simply asks for human help - the system handles that automatically
   - If user says "transfer to human", "I want human help", "talk to a person", etc. - just acknowledge and be helpful, do NOT add ESCALATE_TO_HUMAN
   - When in doubt, just provide helpful troubleshooting without escalation markers

8. IMPORTANT - INTERNAL MARKERS:
   - ESCALATE_TO_HUMAN, HANDOFF_TO:xxx, and CLOSE_TICKET_CONFIRMED are internal system markers
   - Place them ONLY at the very END of your message on a separate line
   - Do NOT repeat them multiple times
   - Do NOT include them in visible conversation text
   - NEVER add ESCALATE_TO_HUMAN just because user wants human help - the system handles that

9. Be empathetic, professional, and patient
10. Ask about device type (Windows 11 or macOS) if not already known from their device list
11. NEVER dump all steps at once - one step, wait for feedback, then next step
12. If you see relevant past tickets, you can reference them to understand recurring issues
13. If issue is outside your specialty, suggest handoff to the right specialist
14. READ THE CONVERSATION HISTORY CAREFULLY - check if you already asked to close and what the user responded`;

  const { output_text } = await createResponse({
    model: DEFAULT_MODEL,
    input: `Ticket Subject: ${ticket.subject}\n\nDescription: ${ticket.description || ''}\n\nConversation so far:\n${conversationHistory}`,
    instructions,
    temperature: 0.5,
    max_output_tokens: 1000,
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

      // Generate initial response with full database context
      const initialResponse = await generateSolution(
        triage.category,
        ticket,
        ''
      );

      // Add initial bot message with human help note
      const cleanedResponse = cleanResponse(initialResponse);
      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_agent_id: botId,
        content: `🤖 Hello! I'm the ${getAgentName(triage.category)}. I've analyzed your issue and I'm here to help.\n\n${cleanedResponse}\n\n---\n💡 *Feel free to ask for human agent help at any time.*`,
        message_type: 'text',
      });

      return NextResponse.json({
        success: true,
        category: triage.category,
        botId,
        initialResponse: cleanedResponse,
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

      // PRIORITY CHECK: Direct human transfer keywords - handle BEFORE any AI processing
      const lowerMessage = userMessage.toLowerCase();
      const wantsHumanTransfer = lowerMessage.includes('transfer to human') ||
                                  lowerMessage.includes('human agent') ||
                                  lowerMessage.includes('talk to human') ||
                                  lowerMessage.includes('speak to human') ||
                                  lowerMessage.includes('real person') ||
                                  lowerMessage.includes('live agent') ||
                                  lowerMessage.includes('human help') ||
                                  lowerMessage.includes('i need human') ||
                                  lowerMessage.includes('want human') ||
                                  lowerMessage.includes('get me a human') ||
                                  lowerMessage.includes('human technician') ||
                                  lowerMessage.includes('human support');

      // Check if previous bot message asked about human handoff
      const lastBotMessage = (messages || [])
        .filter((m: any) => m.sender_agent_id)
        .pop();
      const botAskedAboutHuman = lastBotMessage?.content?.toLowerCase().includes('transfer you to a human agent') ||
                                  lastBotMessage?.content?.toLowerCase().includes('would you like me to transfer');

      // Check if user is confirming human transfer
      const isConfirmingHuman = botAskedAboutHuman && 
                                 lowerMessage.match(/^(yes|yeah|sure|please|ok|okay|go ahead|confirm|do it|yep|yup)\.?$/i);

      // IMMEDIATE HUMAN TRANSFER if user confirms or explicitly requests
      if (wantsHumanTransfer || isConfirmingHuman) {
        // If first time asking, confirm with user
        if (wantsHumanTransfer && !botAskedAboutHuman) {
          await supabase.from('ticket_messages').insert({
            ticket_id: ticketId,
            sender_agent_id: botId,
            content: `I understand you'd like to speak with a human technician.\n\n**Would you like me to transfer you to a human agent now?**\n\nJust say "yes" to confirm, or let me know if you'd prefer to continue troubleshooting with me.`,
            message_type: 'text',
          });

          return NextResponse.json({
            success: true,
            action: 'awaiting_human_confirmation',
            message: 'Asked user to confirm human handoff',
          });
        }

        // User confirmed OR explicitly wants transfer - DO THE TRANSFER NOW
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

      // Check user intent for other actions
      const satisfaction = await checkSatisfaction(userMessage);

      // Handle ticket close confirmation
      if (satisfaction.shouldClose) {
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
            content: cleanResponse(`👋 Hello! I'm the ${getAgentName(targetAgent)}. I've reviewed your conversation and I'm ready to help.\n\n${newAgentResponse}`),
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

      // Add bot response - clean all internal markers and add human help note
      const finalResponse = cleanResponse(response);
      const responseWithNote = finalResponse + `\n\n---\n💡 *Feel free to ask for human agent help at any time.*`;
      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_agent_id: botId,
        content: responseWithNote,
        message_type: 'text',
      });

      // Update ticket status
      await supabase.from('support_tickets').update({
        status_id: 3,
        updated_at: new Date().toISOString(),
      }).eq('ticket_id', ticketId);

      return NextResponse.json({
        success: true,
        response: responseWithNote,
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
