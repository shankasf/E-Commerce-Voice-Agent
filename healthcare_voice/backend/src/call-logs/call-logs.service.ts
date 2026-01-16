import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, filters?: {
    patientId?: string;
    startDate?: string;
    endDate?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = { practiceId };

    if (filters?.patientId) {
      where.patientId = filters.patientId;
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
        appointment: true,
        agentInteractions: true,
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
      },
    });

    const totalCalls = logs.length;
    const completedCalls = logs.filter((l) => l.status === 'completed').length;
    const avgDuration = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / (completedCalls || 1);
    const resolvedCalls = logs.filter((l) => l.resolutionStatus === 'resolved').length;

    return {
      totalCalls,
      completedCalls,
      avgDuration: Math.round(avgDuration),
      resolutionRate: totalCalls ? Math.round((resolvedCalls / totalCalls) * 100) : 0,
      inboundCalls: logs.filter((l) => l.direction === 'inbound').length,
      outboundCalls: logs.filter((l) => l.direction === 'outbound').length,
    };
  }
}
