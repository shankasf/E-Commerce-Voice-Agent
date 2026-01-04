import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const { page = 1, limit = 20, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.started_at = {};
      if (startDate) where.started_at.gte = startDate;
      if (endDate) where.started_at.lte = endDate;
    }

    const [calls, total] = await Promise.all([
      this.prisma.callLog.findMany({
        where,
        include: {
          customer: {
            include: { user: { select: { full_name: true, phone: true } } },
          },
          appointment: { select: { booking_reference: true } },
          interactions: { take: 1, orderBy: { started_at: 'desc' } },
        },
        orderBy: { started_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.callLog.count({ where }),
    ]);

    return {
      data: calls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(callId: string) {
    return this.prisma.callLog.findUnique({
      where: { call_id: callId },
      include: {
        customer: { include: { user: true } },
        appointment: true,
        interactions: { orderBy: { started_at: 'asc' } },
        usage_logs: true,
      },
    });
  }

  async getStats(startDate: Date, endDate: Date) {
    const calls = await this.prisma.callLog.findMany({
      where: {
        started_at: { gte: startDate, lte: endDate },
      },
      include: {
        interactions: { take: 1, orderBy: { started_at: 'desc' } },
      },
    });

    const totalCalls = calls.length;

    // Calculate today's calls
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = calls.filter(c => new Date(c.started_at) >= today).length;

    const avgDuration =
      calls.length > 0
        ? calls.reduce((sum, c) => sum + c.duration_seconds, 0) / calls.length
        : 0;

    // By agent type
    const agentCounts: Record<string, number> = {};
    for (const call of calls) {
      const agentType = call.interactions?.[0]?.agent_type || call.intent_detected || 'unknown';
      agentCounts[agentType] = (agentCounts[agentType] || 0) + 1;
    }
    const byAgent = Object.entries(agentCounts).map(([agent, count]) => ({ agent, count }));

    return {
      totalCalls,
      todayCalls,
      avgDuration: Math.round(avgDuration),
      byAgent,
    };
  }

  async getUsageStats(startDate: Date, endDate: Date) {
    const usageLogs = await this.prisma.elevenLabsUsageLog.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      orderBy: { created_at: 'asc' },
    });

    const totalCharacters = usageLogs.reduce((sum, u) => sum + u.characters_used, 0);
    const totalCostCents = usageLogs.reduce((sum, u) => sum + Number(u.cost_cents), 0);

    // Group by day
    const byDayMap: Record<string, { characters: number; cost: number }> = {};
    for (const log of usageLogs) {
      const date = log.created_at.toISOString().split('T')[0];
      if (!byDayMap[date]) {
        byDayMap[date] = { characters: 0, cost: 0 };
      }
      byDayMap[date].characters += log.characters_used;
      byDayMap[date].cost += Number(log.cost_cents) / 100;
    }
    const byDay = Object.entries(byDayMap).map(([date, data]) => ({
      date,
      characters: data.characters,
      cost: Math.round(data.cost * 100) / 100,
    }));

    return {
      totalCharacters,
      totalCost: Math.round(totalCostCents) / 100,
      byDay,
    };
  }
}
