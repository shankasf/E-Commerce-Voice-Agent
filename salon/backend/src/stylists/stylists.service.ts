import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StylistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.stylist.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      include: {
        services: {
          include: { service: true },
        },
        schedules: true,
      },
    });
  }

  async findById(stylistId: number) {
    return this.prisma.stylist.findUnique({
      where: { stylist_id: stylistId },
      include: {
        services: { include: { service: true } },
        schedules: true,
        reviews: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async getAvailability(stylistId: number, date: Date) {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

    // Get stylist schedule for this day
    const schedule = await this.prisma.stylistSchedule.findFirst({
      where: {
        stylist_id: stylistId,
        day_of_week: dayOfWeek as any,
      },
    });

    if (!schedule || !schedule.is_working) {
      return { available: false, reason: 'Stylist not working this day' };
    }

    // Check for time off
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const timeOff = await this.prisma.stylistTimeOff.findFirst({
      where: {
        stylist_id: stylistId,
        start_datetime: { lte: endOfDay },
        end_datetime: { gte: startOfDay },
      },
    });

    if (timeOff) {
      return { available: false, reason: 'Stylist has time off' };
    }

    // Get booked appointments
    const appointments = await this.prisma.appointment.findMany({
      where: {
        stylist_id: stylistId,
        appointment_date: date,
        status: { notIn: ['cancelled'] },
      },
      select: {
        start_time: true,
        end_time: true,
      },
    });

    return {
      available: true,
      schedule: {
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        break_start: schedule.break_start,
        break_end: schedule.break_end,
      },
      booked_slots: appointments.map(a => ({
        start: a.start_time,
        end: a.end_time,
      })),
    };
  }

  async create(data: {
    full_name: string;
    email?: string;
    phone?: string;
    bio?: string;
    specialties?: string[];
  }) {
    return this.prisma.stylist.create({ data });
  }

  async update(stylistId: number, data: Partial<{
    full_name: string;
    email: string;
    phone: string;
    bio: string;
    specialties: string[];
    is_active: boolean;
  }>) {
    return this.prisma.stylist.update({
      where: { stylist_id: stylistId },
      data,
    });
  }
}
