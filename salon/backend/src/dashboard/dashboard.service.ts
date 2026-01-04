import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's appointments
    const todayAppointments = await this.prisma.appointment.count({
      where: {
        appointment_date: { gte: today, lt: tomorrow },
        status: { notIn: ['cancelled'] },
      },
    });

    // Today's revenue
    const todayRevenue = await this.prisma.appointment.aggregate({
      where: {
        appointment_date: { gte: today, lt: tomorrow },
        status: 'completed',
      },
      _sum: { total_amount: true },
    });

    // Monthly revenue
    const monthlyRevenue = await this.prisma.appointment.aggregate({
      where: {
        appointment_date: { gte: startOfMonth },
        status: 'completed',
      },
      _sum: { total_amount: true },
    });

    // Total customers
    const totalCustomers = await this.prisma.customer.count();

    // New customers this month
    const newCustomersThisMonth = await this.prisma.customer.count({
      where: { created_at: { gte: startOfMonth } },
    });

    // Today's calls
    const todayCalls = await this.prisma.callLog.count({
      where: { started_at: { gte: today } },
    });

    // AI resolution rate
    const aiResolvedCalls = await this.prisma.callLog.count({
      where: {
        started_at: { gte: startOfMonth },
        ai_resolved: true,
      },
    });

    const totalCalls = await this.prisma.callLog.count({
      where: { started_at: { gte: startOfMonth } },
    });

    return {
      today: {
        appointments: todayAppointments,
        revenue: Number(todayRevenue._sum.total_amount) || 0,
        calls: todayCalls,
      },
      month: {
        revenue: Number(monthlyRevenue._sum.total_amount) || 0,
        new_customers: newCustomersThisMonth,
        ai_resolution_rate: totalCalls > 0 ? (aiResolvedCalls / totalCalls) * 100 : 0,
      },
      totals: {
        customers: totalCustomers,
      },
    };
  }

  async getAppointmentStats(startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: {
        appointment_date: { gte: startDate, lte: endDate },
      },
      _count: { status: true },
    });

    return appointments.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  async getRevenueByDay(startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointment_date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        appointment_date: true,
        total_amount: true,
      },
    });

    const revenueByDay: Record<string, number> = {};
    for (const apt of appointments) {
      const dateKey = apt.appointment_date.toISOString().slice(0, 10);
      revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + Number(apt.total_amount);
    }

    return revenueByDay;
  }

  async getAppointmentsByDay(startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointment_date: { gte: startDate, lte: endDate },
      },
      select: {
        appointment_date: true,
      },
    });

    const byDay: Record<string, number> = {};
    for (const apt of appointments) {
      const dateKey = apt.appointment_date.toISOString().slice(0, 10);
      byDay[dateKey] = (byDay[dateKey] || 0) + 1;
    }

    return Object.entries(byDay).map(([day, count]) => ({ day, count }));
  }

  async getPopularServices(limit = 10) {
    const services = await this.prisma.appointmentService.groupBy({
      by: ['service_name'],
      _count: { service_name: true },
      orderBy: { _count: { service_name: 'desc' } },
      take: limit,
    });

    return services.map(s => ({
      name: s.service_name,
      count: s._count.service_name,
    }));
  }

  async getStylistPerformance() {
    const stylists = await this.prisma.stylist.findMany({
      where: { is_active: true },
      include: {
        appointments: {
          where: { status: 'completed' },
          select: { total_amount: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return stylists.map(stylist => {
      const totalRevenue = stylist.appointments.reduce(
        (sum, apt) => sum + Number(apt.total_amount),
        0,
      );
      const avgRating =
        stylist.reviews.length > 0
          ? stylist.reviews.reduce((sum, r) => sum + r.rating, 0) / stylist.reviews.length
          : 0;

      return {
        stylist_id: stylist.stylist_id,
        name: stylist.full_name,
        appointments_count: stylist.appointments.length,
        total_revenue: totalRevenue,
        average_rating: Math.round(avgRating * 10) / 10,
        reviews_count: stylist.reviews.length,
      };
    });
  }

  async getCallAnalytics(startDate: Date, endDate: Date) {
    const calls = await this.prisma.callLog.findMany({
      where: {
        started_at: { gte: startDate, lte: endDate },
      },
      include: {
        interactions: true,
      },
    });

    const totalCalls = calls.length;
    const aiResolved = calls.filter(c => c.ai_resolved).length;
    const escalated = calls.filter(c => c.was_escalated).length;
    const avgDuration =
      calls.length > 0
        ? calls.reduce((sum, c) => sum + c.duration_seconds, 0) / calls.length
        : 0;

    // Calls by action
    const byAction: Record<string, number> = {};
    for (const call of calls) {
      const action = call.action_taken || 'unknown';
      byAction[action] = (byAction[action] || 0) + 1;
    }

    return {
      total: totalCalls,
      ai_resolved: aiResolved,
      escalated,
      average_duration_seconds: Math.round(avgDuration),
      resolution_rate: totalCalls > 0 ? (aiResolved / totalCalls) * 100 : 0,
      by_action: byAction,
    };
  }

  async getSalonSettings() {
    return this.prisma.salonSettings.findFirst();
  }

  async updateSalonSettings(data: Partial<{
    salon_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    booking_notice_hours: number;
    cancellation_hours: number;
  }>) {
    const settings = await this.prisma.salonSettings.findFirst();
    
    if (settings) {
      return this.prisma.salonSettings.update({
        where: { setting_id: settings.setting_id },
        data,
      });
    }
    
    return this.prisma.salonSettings.create({ data: data as any });
  }

  async getBusinessHours() {
    return this.prisma.businessHours.findMany({
      orderBy: { day_of_week: 'asc' },
    });
  }
}
