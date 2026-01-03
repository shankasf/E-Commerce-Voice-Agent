import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get appointment statistics by period' })
  async getAppointmentStatsByPeriod(
    @Query('period') period: 'week' | 'month' | 'year' = 'week',
  ) {
    const { startDate, endDate } = this.getDateRange(period);
    const stats = await this.dashboardService.getAppointmentStats(startDate, endDate);
    const byDay = await this.dashboardService.getAppointmentsByDay(startDate, endDate);
    
    return {
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      completed: stats['completed'] || 0,
      cancelled: stats['cancelled'] || 0,
      noShow: stats['no_show'] || 0,
      byDay,
    };
  }

  @Get('appointments/stats')
  @ApiOperation({ summary: 'Get appointment statistics' })
  async getAppointmentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'week',
  ) {
    const { startDate: start, endDate: end } = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : this.getDateRange(period);
    return this.dashboardService.getAppointmentStats(start, end);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue by day' })
  async getRevenueByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    const { startDate: start, endDate: end } = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : this.getDateRange(period);
    const revenueByDay = await this.dashboardService.getRevenueByDay(start, end);
    const data = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }));
    const total = data.reduce((sum, d) => sum + d.revenue, 0);
    return { data, total };
  }

  private getDateRange(period: 'week' | 'month' | 'year'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  @Get('services/popular')
  @ApiOperation({ summary: 'Get popular services' })
  async getPopularServices(@Query('limit') limit?: string) {
    return this.dashboardService.getPopularServices(limit ? parseInt(limit) : 10);
  }

  @Get('stylists/performance')
  @ApiOperation({ summary: 'Get stylist performance metrics' })
  async getStylistPerformance() {
    return this.dashboardService.getStylistPerformance();
  }

  @Get('calls/analytics')
  @ApiOperation({ summary: 'Get call analytics' })
  async getCallAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getCallAnalytics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get salon settings' })
  async getSalonSettings() {
    return this.dashboardService.getSalonSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update salon settings' })
  async updateSalonSettings(@Body() data: Partial<{
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
    return this.dashboardService.updateSalonSettings(data);
  }

  @Get('hours')
  @ApiOperation({ summary: 'Get business hours' })
  async getBusinessHours() {
    return this.dashboardService.getBusinessHours();
  }
}
