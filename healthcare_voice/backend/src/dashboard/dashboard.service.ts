import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(practiceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todaysAppointments,
      totalPatients,
      activeProviders,
      recentCalls,
      appointmentsByStatus,
    ] = await Promise.all([
      // Today's appointments count
      this.prisma.appointment.count({
        where: {
          practiceId,
          scheduledDate: today,
          status: { notIn: ['cancelled', 'no_show'] },
        },
      }),

      // Total patients
      this.prisma.patient.count({
        where: { practiceId, isActive: true },
      }),

      // Active providers
      this.prisma.provider.count({
        where: { practiceId, isActive: true },
      }),

      // Recent calls (last 24 hours)
      this.prisma.callLog.count({
        where: {
          practiceId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),

      // Today's appointments by status
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          practiceId,
          scheduledDate: today,
        },
        _count: true,
      }),
    ]);

    return {
      todaysAppointments,
      totalPatients,
      activeProviders,
      recentCalls,
      appointmentsByStatus: appointmentsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async getTodaysSchedule(practiceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.appointment.findMany({
      where: {
        practiceId,
        scheduledDate: today,
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phonePrimary: true },
        },
        provider: {
          select: { firstName: true, lastName: true, title: true },
        },
        service: {
          select: { name: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });
  }

  async getRecentActivity(practiceId: string, limit = 10) {
    const [recentAppointments, recentCalls] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { practiceId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.callLog.findMany({
        where: { practiceId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      recentAppointments,
      recentCalls,
    };
  }

  async getPracticeInfo(practiceId: string) {
    return this.prisma.practice.findUnique({
      where: { practiceId },
      select: {
        name: true,
        phone: true,
        email: true,
        addressLine1: true,
        city: true,
        state: true,
        zipCode: true,
        officeHours: true,
        emergencyPhone: true,
      },
    });
  }
}
