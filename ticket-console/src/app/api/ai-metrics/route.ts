import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

export const dynamic = 'force-dynamic';

const HUMAN_AVG_RESOLUTION_TIME_MINS = 45;
const AI_AVG_RESPONSE_TIME_SECS = 8;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    const [tickets, assignments, messages, orgs] = await Promise.all([
      queryMany(
        `SELECT t.ticket_id, t.subject, t.status_id, t.priority_id, t.requires_human_agent,
          t.created_at, t.closed_at, t.organization_id,
          json_build_object('name', o.name) as organization
        FROM support_tickets t
        LEFT JOIN organizations o ON t.organization_id = o.organization_id
        WHERE t.created_at >= $1 AND t.created_at <= $2`,
        [startDateISO, endDateISO]
      ),
      queryMany(
        `SELECT ta.ticket_id,
          json_build_object('support_agent_id', sa.support_agent_id, 'full_name', sa.full_name, 'agent_type', sa.agent_type) as support_agent
        FROM ticket_assignments ta
        LEFT JOIN support_agents sa ON ta.support_agent_id = sa.support_agent_id`
      ),
      queryMany(
        `SELECT tm.message_id, tm.ticket_id, tm.message_time, tm.sender_agent_id, tm.sender_contact_id,
          json_build_object('agent_type', sa.agent_type) as sender_agent
        FROM ticket_messages tm
        LEFT JOIN support_agents sa ON tm.sender_agent_id = sa.support_agent_id
        ORDER BY tm.message_time ASC`
      ),
      queryMany(`SELECT organization_id, name FROM organizations`),
    ]);

    const ticketList = tickets || [];
    const assignmentList = assignments || [];
    const messageList = messages || [];
    const orgList = orgs || [];

    const ticketAssignments: Record<number, any[]> = {};
    assignmentList.forEach((a: any) => {
      if (!ticketAssignments[a.ticket_id]) ticketAssignments[a.ticket_id] = [];
      ticketAssignments[a.ticket_id].push(a);
    });

    const ticketMessages: Record<number, any[]> = {};
    messageList.forEach((m: any) => {
      if (!ticketMessages[m.ticket_id]) ticketMessages[m.ticket_id] = [];
      ticketMessages[m.ticket_id].push(m);
    });

    let totalTickets = ticketList.length;
    let resolvedByAI = 0, resolvedByHuman = 0, escalatedToHuman = 0, pendingTickets = 0;
    let aiResponseCount = 0, humanResponseCount = 0;
    let totalAIResponseTimeMs = 0, totalHumanResponseTimeMs = 0;

    const orgAIPreference: Record<string, { ai: number; human: number; name: string }> = {};
    orgList.forEach((org: any) => {
      orgAIPreference[org.organization_id] = { ai: 0, human: 0, name: org.name };
    });

    const dailyResolutions: Record<string, { ai: number; human: number }> = {};
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = daysDiff; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      dailyResolutions[date.toISOString().split('T')[0]] = { ai: 0, human: 0 };
    }

    const priorityStats: Record<number, { ai: number; human: number }> = {
      1: { ai: 0, human: 0 }, 2: { ai: 0, human: 0 },
      3: { ai: 0, human: 0 }, 4: { ai: 0, human: 0 },
    };

    ticketList.forEach((ticket: any) => {
      const ticketId = ticket.ticket_id;
      const assigns = ticketAssignments[ticketId] || [];
      const msgs = ticketMessages[ticketId] || [];
      const isResolved = ticket.status_id === 5 || ticket.status_id === 6;
      const orgId = ticket.organization_id;

      const hasAIAssignment = assigns.some((a: any) => a.support_agent?.agent_type === 'Bot');
      const hasHumanAssignment = assigns.some((a: any) => a.support_agent?.agent_type === 'Human');
      const requiresHuman = ticket.requires_human_agent;

      const aiMessages = msgs.filter((m: any) => m.sender_agent?.agent_type === 'Bot');
      const humanAgentMessages = msgs.filter((m: any) => m.sender_agent?.agent_type === 'Human');
      aiResponseCount += aiMessages.length;
      humanResponseCount += humanAgentMessages.length;

      let prevContactMsgTime: Date | null = null;
      msgs.forEach((msg: any) => {
        const msgTime = new Date(msg.message_time);
        if (msg.sender_contact_id) {
          prevContactMsgTime = msgTime;
        } else if (prevContactMsgTime && msg.sender_agent_id) {
          const responseTime = msgTime.getTime() - prevContactMsgTime.getTime();
          if (msg.sender_agent?.agent_type === 'Bot') totalAIResponseTimeMs += responseTime;
          else if (msg.sender_agent?.agent_type === 'Human') totalHumanResponseTimeMs += responseTime;
          prevContactMsgTime = null;
        }
      });

      if (isResolved) {
        const closedDate = ticket.closed_at ? new Date(ticket.closed_at).toISOString().split('T')[0] : null;
        if (requiresHuman || hasHumanAssignment) {
          resolvedByHuman++;
          if (closedDate && dailyResolutions[closedDate]) dailyResolutions[closedDate].human++;
          if (orgId && orgAIPreference[orgId]) orgAIPreference[orgId].human++;
          if (priorityStats[ticket.priority_id]) priorityStats[ticket.priority_id].human++;
        } else if (hasAIAssignment && aiMessages.length > 0) {
          resolvedByAI++;
          if (closedDate && dailyResolutions[closedDate]) dailyResolutions[closedDate].ai++;
          if (orgId && orgAIPreference[orgId]) orgAIPreference[orgId].ai++;
          if (priorityStats[ticket.priority_id]) priorityStats[ticket.priority_id].ai++;
        }
      } else {
        pendingTickets++;
      }

      if (requiresHuman && hasAIAssignment) escalatedToHuman++;
    });

    const avgAIResponseTime = aiResponseCount > 0
      ? Math.round(totalAIResponseTimeMs / aiResponseCount / 1000)
      : AI_AVG_RESPONSE_TIME_SECS;

    const avgHumanResponseTime = humanResponseCount > 0
      ? Math.round(totalHumanResponseTimeMs / humanResponseCount / 1000 / 60)
      : HUMAN_AVG_RESOLUTION_TIME_MINS;

    const timeSavedByAI = Math.round((resolvedByAI * HUMAN_AVG_RESOLUTION_TIME_MINS) / 60);
    const totalResolved = resolvedByAI + resolvedByHuman;
    const aiResolutionRate = totalResolved > 0 ? Math.round((resolvedByAI / totalResolved) * 100) : 0;
    const costSavedByAI = timeSavedByAI * 25;

    const orgPreferenceData = Object.values(orgAIPreference)
      .filter((org: any) => org.ai > 0 || org.human > 0)
      .map((org: any) => ({
        name: org.name.length > 15 ? org.name.substring(0, 15) + '...' : org.name,
        ai: org.ai, human: org.human,
        aiPercentage: org.ai + org.human > 0 ? Math.round((org.ai / (org.ai + org.human)) * 100) : 0
      }))
      .sort((a, b) => (b.ai + b.human) - (a.ai + a.human))
      .slice(0, 10);

    const dailyTrendData = Object.entries(dailyResolutions).map(([date, data]) => ({
      date: date.slice(5), ai: data.ai, human: data.human,
    }));

    const priorityLabels: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
    const priorityData = Object.entries(priorityStats).map(([id, data]) => ({
      priority: priorityLabels[parseInt(id)], ai: data.ai, human: data.human,
    }));

    return NextResponse.json({
      summary: {
        totalTickets, resolvedByAI, resolvedByHuman, escalatedToHuman, pendingTickets,
        aiResolutionRate, timeSavedByAI, costSavedByAI,
        avgAIResponseTime, avgHumanResponseTime,
        aiMessagesCount: aiResponseCount, humanMessagesCount: humanResponseCount,
      },
      charts: {
        dailyTrend: dailyTrendData,
        orgPreference: orgPreferenceData,
        priorityBreakdown: priorityData,
        firstResponseComparison: { ai: avgAIResponseTime, human: avgHumanResponseTime * 60 },
      },
    });
  } catch (error) {
    console.error('Error fetching AI metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
