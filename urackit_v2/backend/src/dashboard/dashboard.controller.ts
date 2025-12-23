import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
// @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
// @ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get device metrics and list' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', '90d'] })
  async getDevices(@Query('range') range?: string) {
    return this.dashboardService.getDeviceMetrics(range);
  }

  @Get('calls')
  @ApiOperation({ summary: 'Get call metrics and logs' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', '90d'] })
  async getCalls(@Query('range') range?: string) {
    return this.dashboardService.getCallMetrics(range);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get ticket metrics and list' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', '90d'] })
  async getTickets(@Query('range') range?: string) {
    return this.dashboardService.getTicketMetrics(range);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get organizations list with stats' })
  async getOrganizations() {
    return this.dashboardService.getOrganizations();
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contacts list with stats' })
  async getContacts() {
    return this.dashboardService.getContacts();
  }

  @Get('costs')
  @ApiOperation({ summary: 'Get cost summary (AI + Twilio)' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', '90d'] })
  async getCostSummary(@Query('range') range?: string) {
    return this.dashboardService.getCostSummary(range);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system health metrics' })
  async getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily aggregated metrics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getDailyMetrics(@Query('days') days?: number) {
    return this.dashboardService.getDailyMetrics(days || 7);
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Get hourly metrics for charts' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  async getHourlyMetrics(@Query('date') date?: string) {
    return this.dashboardService.getHourlyMetrics(date);
  }
}
