import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, filters?: {
    date?: string;
    providerId?: string;
    patientId?: string;
    status?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = { practiceId };

    if (filters?.date) {
      where.scheduledDate = new Date(filters.date);
    }
    if (filters?.providerId) {
      where.providerId = filters.providerId;
    }
    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        include: {
          patient: {
            select: { firstName: true, lastName: true, phonePrimary: true },
          },
          provider: {
            select: { firstName: true, lastName: true, title: true, specialization: true },
          },
          service: {
            select: { name: true, duration: true },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { appointments, total };
  }

  async findToday(practiceId: string, providerId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      practiceId,
      scheduledDate: today,
    };

    if (providerId) {
      where.providerId = providerId;
    }

    return this.prisma.appointment.findMany({
      where,
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

  async findOne(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { appointmentId },
      include: {
        patient: true,
        provider: true,
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async getAvailableSlots(providerId: string, date: string, duration = 30) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get provider schedule for this day
    const schedule = await this.prisma.providerSchedule.findFirst({
      where: {
        providerId,
        dayOfWeek,
        isAvailable: true,
      },
    });

    if (!schedule) {
      return [];
    }

    // Check for time off
    const timeOff = await this.prisma.providerTimeOff.findFirst({
      where: {
        providerId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });

    if (timeOff) {
      return [];
    }

    // Get existing appointments
    const existing = await this.prisma.appointment.findMany({
      where: {
        providerId,
        scheduledDate: targetDate,
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { scheduledTime: true, endTime: true, duration: true },
    });

    // Generate slots
    const slots = [];
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin + duration <= endMin)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const slotEndMin = currentMin + duration;
      const slotEndHour = currentHour + Math.floor(slotEndMin / 60);
      const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

      // Check if slot conflicts with existing appointments
      const isAvailable = !existing.some((appt) => {
        const apptStart = appt.scheduledTime;
        const apptEnd = appt.endTime || appt.scheduledTime;
        return !(slotEnd <= apptStart || slotStart >= apptEnd);
      });

      if (isAvailable) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          date,
        });
      }

      // Move to next slot (30-minute intervals)
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin -= 60;
      }
    }

    return slots;
  }

  async create(data: any) {
    // Check slot availability
    const slots = await this.getAvailableSlots(data.providerId, data.scheduledDate, data.duration || 30);
    const isAvailable = slots.some((s) => s.startTime === data.scheduledTime);

    if (!isAvailable) {
      throw new ConflictException('Time slot is not available');
    }

    return this.prisma.appointment.create({
      data: {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
      },
    });
  }

  async update(appointmentId: string, data: any) {
    if (data.scheduledDate) {
      data.scheduledDate = new Date(data.scheduledDate);
    }

    return this.prisma.appointment.update({
      where: { appointmentId },
      data,
    });
  }

  async cancel(appointmentId: string, reason?: string) {
    return this.prisma.appointment.update({
      where: { appointmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async reschedule(appointmentId: string, newDate: string, newTime: string, newProviderId?: string) {
    const original = await this.findOne(appointmentId);

    // Mark original as rescheduled
    await this.prisma.appointment.update({
      where: { appointmentId },
      data: { status: 'rescheduled' },
    });

    // Create new appointment
    const newAppointment = await this.prisma.appointment.create({
      data: {
        practiceId: original.practiceId,
        patientId: original.patientId,
        providerId: newProviderId || original.providerId,
        serviceId: original.serviceId,
        appointmentType: original.appointmentType,
        scheduledDate: new Date(newDate),
        scheduledTime: newTime,
        duration: original.duration,
        chiefComplaint: original.chiefComplaint,
        rescheduledFromId: appointmentId,
        createdVia: 'voice',
      },
    });

    // Update original with reference
    await this.prisma.appointment.update({
      where: { appointmentId },
      data: { rescheduledToId: newAppointment.appointmentId },
    });

    return newAppointment;
  }

  async confirm(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { appointmentId },
      data: {
        status: 'confirmed',
        confirmationSent: true,
        confirmationSentAt: new Date(),
      },
    });
  }

  async checkIn(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { appointmentId },
      data: {
        status: 'checked_in',
        checkedInAt: new Date(),
      },
    });
  }
}
