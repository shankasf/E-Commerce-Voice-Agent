import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Average time a human takes to resolve a ticket (in minutes) - industry benchmark
const HUMAN_AVG_RESOLUTION_TIME_MINS = 45;
// Average time AI takes to respond (in seconds)
const AI_AVG_RESPONSE_TIME_SECS = 8;

export async function GET(request: NextRequest) {
  try {
    // Get all tickets with their assignments and messages
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select(`
        ticket_id,
        subject,
        status_id,
        priority_id,
        requires_human_agent,
        created_at,
        closed_at,
        organization:organization_id(name)
      `);

    if (ticketsError) throw ticketsError;

    // Get all ticket assignments with agent info
    const { data: assignments, error: assignError } = await supabase
      .from('ticket_assignments')
      .select(`
        ticket_id,
        support_agent:support_agent_id(support_agent_id, full_name, agent_type)
      `);

    if (assignError) throw assignError;

    // Get all messages to analyze conversation patterns
    const { data: messages, error: msgError } = await supabase
      .from('ticket_messages')
      .select(`
        message_id,
        ticket_id,
        message_time,
        sender_agent_id,
        sender_contact_id,
        sender_agent:sender_agent_id(agent_type)
      `)
      .order('message_time', { ascending: true });

    if (msgError) throw msgError;

    // Get organizations for category analysis
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('organization_id, name');

    if (orgsError) throw orgsError;

    // Process metrics
    const ticketList = tickets || [];
    const assignmentList = assignments || [];
    const messageList = messages || [];
    const orgList = orgs || [];

    // Build assignment map: ticket_id -> agent info
    const ticketAssignments: Record<number, any[]> = {};
    assignmentList.forEach((a: any) => {
      if (!ticketAssignments[a.ticket_id]) {
        ticketAssignments[a.ticket_id] = [];
      }
      ticketAssignments[a.ticket_id].push(a);
    });

    // Build message map: ticket_id -> messages
    const ticketMessages: Record<number, any[]> = {};
    messageList.forEach((m: any) => {
      if (!ticketMessages[m.ticket_id]) {
        ticketMessages[m.ticket_id] = [];
      }
      ticketMessages[m.ticket_id].push(m);
    });

    // Metrics calculations
    let totalTickets = ticketList.length;
    let resolvedByAI = 0;
    let resolvedByHuman = 0;
    let escalatedToHuman = 0;
    let pendingTickets = 0;
    let aiResponseCount = 0;
    let humanResponseCount = 0;
    let totalAIResponseTimeMs = 0;
    let totalHumanResponseTimeMs = 0;

    // Organization preference tracking
    const orgAIPreference: Record<string, { ai: number; human: number; name: string }> = {};
    orgList.forEach((org: any) => {
      orgAIPreference[org.organization_id] = { ai: 0, human: 0, name: org.name };
    });

    // Daily resolution tracking (last 30 days)
    const dailyResolutions: Record<string, { ai: number; human: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyResolutions[dateStr] = { ai: 0, human: 0 };
    }

    // Priority handling
    const priorityStats: Record<number, { ai: number; human: number }> = {
      1: { ai: 0, human: 0 }, // Low
      2: { ai: 0, human: 0 }, // Medium
      3: { ai: 0, human: 0 }, // High
      4: { ai: 0, human: 0 }, // Critical
    };

    // Process each ticket
    ticketList.forEach((ticket: any) => {
      const ticketId = ticket.ticket_id;
      const assigns = ticketAssignments[ticketId] || [];
      const msgs = ticketMessages[ticketId] || [];
      const isResolved = ticket.status_id === 5 || ticket.status_id === 6;
      const orgId = ticket.organization?.organization_id || ticket.organization_id;

      // Check if handled by AI or Human
      const hasAIAssignment = assigns.some((a: any) => a.support_agent?.agent_type === 'Bot');
      const hasHumanAssignment = assigns.some((a: any) => a.support_agent?.agent_type === 'Human');
      const requiresHuman = ticket.requires_human_agent;

      // Count AI and Human messages
      const aiMessages = msgs.filter((m: any) => m.sender_agent?.agent_type === 'Bot');
      const humanAgentMessages = msgs.filter((m: any) => m.sender_agent?.agent_type === 'Human');

      aiResponseCount += aiMessages.length;
      humanResponseCount += humanAgentMessages.length;

      // Calculate response times
      let prevContactMsgTime: Date | null = null;
      msgs.forEach((msg: any) => {
        const msgTime = new Date(msg.message_time);
        if (msg.sender_contact_id) {
          prevContactMsgTime = msgTime;
        } else if (prevContactMsgTime && msg.sender_agent_id) {
          const responseTime = msgTime.getTime() - prevContactMsgTime.getTime();
          if (msg.sender_agent?.agent_type === 'Bot') {
            totalAIResponseTimeMs += responseTime;
          } else if (msg.sender_agent?.agent_type === 'Human') {
            totalHumanResponseTimeMs += responseTime;
          }
          prevContactMsgTime = null;
        }
      });

      // Resolution tracking
      if (isResolved) {
        const closedDate = ticket.closed_at ? new Date(ticket.closed_at).toISOString().split('T')[0] : null;

        // Determine who resolved it
        if (requiresHuman || hasHumanAssignment) {
          resolvedByHuman++;
          if (closedDate && dailyResolutions[closedDate]) {
            dailyResolutions[closedDate].human++;
          }
          if (orgId && orgAIPreference[orgId]) {
            orgAIPreference[orgId].human++;
          }
          if (priorityStats[ticket.priority_id]) {
            priorityStats[ticket.priority_id].human++;
          }
        } else if (hasAIAssignment && aiMessages.length > 0) {
          resolvedByAI++;
          if (closedDate && dailyResolutions[closedDate]) {
            dailyResolutions[closedDate].ai++;
          }
          if (orgId && orgAIPreference[orgId]) {
            orgAIPreference[orgId].ai++;
          }
          if (priorityStats[ticket.priority_id]) {
            priorityStats[ticket.priority_id].ai++;
          }
        }
      } else {
        pendingTickets++;
      }

      // Escalation tracking
      if (requiresHuman && hasAIAssignment) {
        escalatedToHuman++;
      }
    });

    // Calculate average response times
    const avgAIResponseTime = aiResponseCount > 0 
      ? Math.round(totalAIResponseTimeMs / aiResponseCount / 1000) // in seconds
      : AI_AVG_RESPONSE_TIME_SECS;
    
    const avgHumanResponseTime = humanResponseCount > 0
      ? Math.round(totalHumanResponseTimeMs / humanResponseCount / 1000 / 60) // in minutes
      : HUMAN_AVG_RESOLUTION_TIME_MINS;

    // Calculate time saved by AI (in hours)
    const timeSavedByAI = Math.round((resolvedByAI * HUMAN_AVG_RESOLUTION_TIME_MINS) / 60);

    // Calculate AI resolution rate
    const totalResolved = resolvedByAI + resolvedByHuman;
    const aiResolutionRate = totalResolved > 0 
      ? Math.round((resolvedByAI / totalResolved) * 100)
      : 0;

    // Calculate cost savings (assuming $25/hour for human agent)
    const costSavedByAI = timeSavedByAI * 25;

    // Prepare organization preference data for chart
    const orgPreferenceData = Object.values(orgAIPreference)
      .filter((org: any) => org.ai > 0 || org.human > 0)
      .map((org: any) => ({
        name: org.name.length > 15 ? org.name.substring(0, 15) + '...' : org.name,
        ai: org.ai,
        human: org.human,
        aiPercentage: org.ai + org.human > 0 
          ? Math.round((org.ai / (org.ai + org.human)) * 100) 
          : 0
      }))
      .sort((a, b) => (b.ai + b.human) - (a.ai + a.human))
      .slice(0, 10);

    // Prepare daily trend data
    const dailyTrendData = Object.entries(dailyResolutions)
      .map(([date, data]) => ({
        date: date.slice(5), // MM-DD format
        ai: data.ai,
        human: data.human,
      }));

    // Priority labels
    const priorityLabels: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Critical',
    };

    const priorityData = Object.entries(priorityStats).map(([id, data]) => ({
      priority: priorityLabels[parseInt(id)],
      ai: data.ai,
      human: data.human,
    }));

    // First response time comparison
    const firstResponseComparison = {
      ai: avgAIResponseTime, // seconds
      human: avgHumanResponseTime * 60, // convert to seconds for comparison
    };

    return NextResponse.json({
      summary: {
        totalTickets,
        resolvedByAI,
        resolvedByHuman,
        escalatedToHuman,
        pendingTickets,
        aiResolutionRate,
        timeSavedByAI, // hours
        costSavedByAI, // dollars
        avgAIResponseTime, // seconds
        avgHumanResponseTime, // minutes
        aiMessagesCount: aiResponseCount,
        humanMessagesCount: humanResponseCount,
      },
      charts: {
        dailyTrend: dailyTrendData,
        orgPreference: orgPreferenceData,
        priorityBreakdown: priorityData,
        firstResponseComparison,
      },
    });
  } catch (error) {
    console.error('Error fetching AI metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
