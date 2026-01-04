import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: {
    customerId?: number;
    stylistId?: number;
    date?: Date;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20, ...filters } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.customerId) where.customer_id = filters.customerId;
    if (filters.stylistId) where.stylist_id = filters.stylistId;
    if (filters.date) where.appointment_date = filters.date;
    if (filters.status) where.status = filters.status;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          customer: { include: { user: { select: { full_name: true, phone: true, email: true } } } },
          stylist: { select: { full_name: true } },
          services: { include: { service: true } },
        },
        orderBy: [{ appointment_date: 'desc' }, { start_time: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(appointmentId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        customer: { include: { user: true } },
        stylist: true,
        services: { include: { service: true } },
        payments: true,
        review: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async findByReference(bookingReference: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { booking_reference: bookingReference },
      include: {
        customer: { include: { user: true } },
        stylist: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async getCustomerAppointments(customerId: number, upcoming = true) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.appointment.findMany({
      where: {
        customer_id: customerId,
        ...(upcoming && { appointment_date: { gte: today } }),
        status: { notIn: ['cancelled'] },
      },
      include: {
        stylist: { select: { full_name: true, avatar_url: true } },
        services: true,
      },
      orderBy: [{ appointment_date: 'asc' }, { start_time: 'asc' }],
    });
  }

  async getAvailableSlots(serviceId: number, date: Date, stylistId?: number) {
    // Get service details
    const service = await this.prisma.service.findUnique({
      where: { service_id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Get business hours for the day
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const businessHours = await this.prisma.businessHours.findFirst({
      where: { day_of_week: dayOfWeek as any },
    });

    if (!businessHours || !businessHours.is_open) {
      return [];
    }

    // Get stylists who can perform this service
    let stylists = [];
    if (stylistId) {
      stylists = [{ stylist_id: stylistId }];
    } else {
      const stylistServices = await this.prisma.stylistService.findMany({
        where: { service_id: serviceId },
        include: { stylist: { select: { stylist_id: true, full_name: true, is_active: true } } },
      });
      
      stylists = stylistServices
        .filter(ss => ss.stylist.is_active)
        .map(ss => ({ stylist_id: ss.stylist.stylist_id, name: ss.stylist.full_name }));

      // If no specific assignments, get all active stylists
      if (stylists.length === 0) {
        const allStylists = await this.prisma.stylist.findMany({
          where: { is_active: true },
          select: { stylist_id: true, full_name: true },
        });
        stylists = allStylists.map(s => ({ stylist_id: s.stylist_id, name: s.full_name }));
      }
    }

    // Generate time slots
    const slots = [];
    const slotDuration = 30; // 30-minute slots
    const serviceDuration = service.duration_minutes;

    // Parse time strings or Date objects
    const parseTime = (time: any): { hours: number; minutes: number } => {
      if (time instanceof Date) {
        return { hours: time.getHours(), minutes: time.getMinutes() };
      }
      if (typeof time === 'string') {
        const [hours, minutes] = time.split(':').map(Number);
        return { hours: hours || 0, minutes: minutes || 0 };
      }
      return { hours: 0, minutes: 0 };
    };

    const openTime = parseTime(businessHours.open_time);
    const closeTime = parseTime(businessHours.close_time);

    let currentSlot = new Date(date);
    currentSlot.setHours(openTime.hours, openTime.minutes, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(closeTime.hours, closeTime.minutes, 0, 0);

    while (currentSlot.getTime() + serviceDuration * 60000 <= endOfDay.getTime()) {
      const slotTime = currentSlot.toTimeString().slice(0, 5);

      for (const stylist of stylists) {
        // Check if slot is available for this stylist
        const existingAppointment = await this.prisma.appointment.findFirst({
          where: {
            stylist_id: stylist.stylist_id,
            appointment_date: date,
            status: { notIn: ['cancelled'] },
            OR: [
              {
                start_time: { lte: currentSlot },
                end_time: { gt: currentSlot },
              },
            ],
          },
        });

        if (!existingAppointment) {
          slots.push({
            time: slotTime,
            stylist_id: stylist.stylist_id,
            stylist_name: (stylist as any).name || 'Available Stylist',
          });
        }
      }

      currentSlot = new Date(currentSlot.getTime() + slotDuration * 60000);
    }

    return slots;
  }

  async create(data: {
    customer_id: number;
    stylist_id: number;
    service_ids: number[];
    appointment_date: Date;
    start_time: Date;
    customer_notes?: string;
    booked_via?: string;
  }) {
    // Get services
    const services = await this.prisma.service.findMany({
      where: { service_id: { in: data.service_ids } },
    });

    if (services.length === 0) {
      throw new BadRequestException('No valid services provided');
    }

    // Calculate totals
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const subtotal = services.reduce((sum, s) => sum + Number(s.price), 0);

    // Calculate end time
    const endTime = new Date(data.start_time.getTime() + totalDuration * 60000);

    // Generate booking reference
    const dateStr = data.appointment_date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.appointment.count({
      where: {
        booking_reference: { startsWith: `GB-${dateStr}` },
      },
    });
    const bookingReference = `GB-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        booking_reference: bookingReference,
        customer_id: data.customer_id,
        stylist_id: data.stylist_id,
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        end_time: endTime,
        duration_minutes: totalDuration,
        subtotal,
        total_amount: subtotal,
        status: 'confirmed',
        confirmed_at: new Date(),
        customer_notes: data.customer_notes,
        booked_via: data.booked_via || 'website',
      },
    });

    // Add services
    for (let i = 0; i < services.length; i++) {
      await this.prisma.appointmentService.create({
        data: {
          appointment_id: appointment.appointment_id,
          service_id: services[i].service_id,
          service_name: services[i].name,
          price: services[i].price,
          duration_minutes: services[i].duration_minutes,
          sequence_order: i + 1,
        },
      });
    }

    return this.findById(appointment.appointment_id);
  }

  async reschedule(appointmentId: number, newDate: Date, newStartTime: Date, newStylistId?: number) {
    const appointment = await this.findById(appointmentId);

    const endTime = new Date(newStartTime.getTime() + appointment.duration_minutes * 60000);

    return this.prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: {
        appointment_date: newDate,
        start_time: newStartTime,
        end_time: endTime,
        ...(newStylistId && { stylist_id: newStylistId }),
        status: 'confirmed',
        confirmed_at: new Date(),
      },
    });
  }

  async cancel(appointmentId: number, userId: string, reason?: string) {
    return this.prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancellation_reason: reason,
      },
    });
  }

  async updateStatus(appointmentId: number, status: string) {
    const updateData: any = { status };

    if (status === 'confirmed') updateData.confirmed_at = new Date();
    if (status === 'in_progress') updateData.started_at = new Date();
    if (status === 'completed') updateData.completed_at = new Date();

    return this.prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: updateData,
    });
  }
}
