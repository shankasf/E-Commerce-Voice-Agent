import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { user: { full_name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search } } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          user: {
            select: { full_name: true, email: true, phone: true, avatar_url: true },
          },
          preferred_stylist: { select: { full_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { customer_id: customerId },
      include: {
        user: true,
        preferred_stylist: true,
        favorites: { include: { service: true } },
        appointments: {
          take: 10,
          orderBy: { appointment_date: 'desc' },
          include: { stylist: { select: { full_name: true } }, services: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async findByPhone(phone: string) {
    const user = await this.prisma.user.findFirst({
      where: { phone },
      include: { customer: true },
    });

    if (!user || !user.customer) {
      return null;
    }

    return this.findById(user.customer.customer_id);
  }

  async update(customerId: number, data: Partial<{
    notes: string;
    allergies: string;
    preferences: string;
    preferred_stylist_id: number;
    is_vip: boolean;
  }>) {
    return this.prisma.customer.update({
      where: { customer_id: customerId },
      data,
    });
  }

  async addFavorite(customerId: number, serviceId: number) {
    return this.prisma.customerFavorite.create({
      data: { customer_id: customerId, service_id: serviceId },
    });
  }

  async removeFavorite(customerId: number, serviceId: number) {
    return this.prisma.customerFavorite.delete({
      where: {
        customer_id_service_id: { customer_id: customerId, service_id: serviceId },
      },
    });
  }

  async getStats(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { customer_id: customerId },
    });

    const appointmentsCount = await this.prisma.appointment.count({
      where: { customer_id: customerId, status: 'completed' },
    });

    const upcomingCount = await this.prisma.appointment.count({
      where: {
        customer_id: customerId,
        status: { in: ['pending', 'confirmed'] },
        appointment_date: { gte: new Date() },
      },
    });

    return {
      total_visits: customer?.total_visits || 0,
      total_spent: customer?.total_spent || 0,
      loyalty_points: customer?.loyalty_points || 0,
      upcoming_appointments: upcomingCount,
      is_vip: customer?.is_vip || false,
    };
  }
}
