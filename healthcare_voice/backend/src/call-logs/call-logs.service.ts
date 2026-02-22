import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, filters?: {
    patientId?: string;
    startDate?: string;
    endDate?: string;
    agentType?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};

    if (practiceId) {
      where.practiceId = practiceId;
    }

    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters?.agentType) {
      where.agentType = filters.agentType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.callLog.findMany({
        where,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        include: {
          patient: {
            select: { firstName: true, lastName: true },
          },
          provider: {
            select: { firstName: true, lastName: true, title: true },
          },
          analytics: {
            select: {
              sentimentLabel: true,
              leadClassification: true,
              intent: true,
              patientSatisfaction: true,
              escalationRequired: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.callLog.count({ where }),
    ]);

    return { logs, total };
  }

  async findOne(logId: string) {
    return this.prisma.callLog.findUnique({
      where: { logId },
      include: {
        patient: true,
        provider: true,
        appointment: {
          include: {
            service: { select: { name: true } },
          },
        },
        agentInteractions: true,
        analytics: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.callLog.create({ data });
  }

  async update(logId: string, data: any) {
    return this.prisma.callLog.update({
      where: { logId },
      data,
    });
  }

  async getStats(practiceId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.callLog.findMany({
      where: {
        practiceId,
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        direction: true,
        durationSeconds: true,
        resolutionStatus: true,
        agentType: true,
        analytics: {
          select: {
            sentimentLabel: true,
            leadClassification: true,
            patientSatisfaction: true,
          },
        },
      },
    });

    const totalCalls = logs.length;
    const completedCalls = logs.filter((l) => l.status === 'completed').length;
    const avgDuration = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / (completedCalls || 1);

    // Sentiment breakdown
    const sentiments = logs.filter(l => l.analytics?.sentimentLabel).map(l => l.analytics!.sentimentLabel);
    const sentimentBreakdown = {
      positive: sentiments.filter(s => s === 'positive').length,
      neutral: sentiments.filter(s => s === 'neutral').length,
      negative: sentiments.filter(s => s === 'negative').length,
      mixed: sentiments.filter(s => s === 'mixed').length,
    };

    // Lead breakdown
    const leads = logs.filter(l => l.analytics?.leadClassification).map(l => l.analytics!.leadClassification);
    const leadBreakdown = {
      hot: leads.filter(l => l === 'hot').length,
      warm: leads.filter(l => l === 'warm').length,
      cold: leads.filter(l => l === 'cold').length,
    };

    // Average satisfaction
    const satisfactionScores = logs.filter(l => l.analytics?.patientSatisfaction).map(l => l.analytics!.patientSatisfaction!);
    const avgSatisfaction = satisfactionScores.length > 0
      ? Math.round((satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length) * 10) / 10
      : 0;

    // Channel breakdown
    const voiceCalls = logs.filter(l => l.agentType === 'voice_webrtc').length;
    const chatSessions = logs.filter(l => l.agentType === 'chat').length;

    return {
      totalCalls,
      completedCalls,
      avgDuration: Math.round(avgDuration),
      resolutionRate: totalCalls ? Math.round((completedCalls / totalCalls) * 100) : 0,
      inboundCalls: logs.filter((l) => l.direction === 'inbound').length,
      outboundCalls: logs.filter((l) => l.direction === 'outbound').length,
      voiceCalls,
      chatSessions,
      sentimentBreakdown,
      leadBreakdown,
      avgSatisfaction,
    };
  }
}
