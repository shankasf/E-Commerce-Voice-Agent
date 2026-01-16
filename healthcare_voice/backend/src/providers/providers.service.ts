import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, filters?: { specialization?: string; activeOnly?: boolean }) {
    const where: any = { practiceId };

    if (filters?.activeOnly !== false) {
      where.isActive = true;
    }

    if (filters?.specialization) {
      where.specialization = { contains: filters.specialization, mode: 'insensitive' };
    }

    return this.prisma.provider.findMany({
      where,
      include: {
        department: { select: { name: true } },
        schedules: { where: { isAvailable: true }, orderBy: { dayOfWeek: 'asc' } },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async findOne(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { providerId },
      include: {
        department: { select: { name: true } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async findByName(name: string, practiceId: string) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return this.prisma.provider.findFirst({
        where: {
          practiceId,
          firstName: { contains: parts[0], mode: 'insensitive' },
          lastName: { contains: parts[parts.length - 1], mode: 'insensitive' },
        },
      });
    }

    return this.prisma.provider.findFirst({
      where: {
        practiceId,
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } },
        ],
      },
    });
  }

  async getSchedule(providerId: string) {
    return this.prisma.providerSchedule.findMany({
      where: { providerId, isAvailable: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getTimeOff(providerId: string, startDate: Date, endDate: Date) {
    return this.prisma.providerTimeOff.findMany({
      where: {
        providerId,
        endDate: { gte: startDate },
        startDate: { lte: endDate },
      },
    });
  }

  async getAppointments(providerId: string, date?: string) {
    const where: any = { providerId };

    if (date) {
      where.scheduledDate = new Date(date);
    } else {
      where.scheduledDate = { gte: new Date() };
    }

    where.status = { notIn: ['cancelled', 'no_show'] };

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phonePrimary: true,
          },
        },
        service: {
          select: { name: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });
  }
}
