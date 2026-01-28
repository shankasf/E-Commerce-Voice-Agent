import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

// Default practice ID for demo mode
const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview() {
    return this.dashboardService.getOverview(DEFAULT_PRACTICE_ID);
  }

  @Get('today')
  async getTodaysSchedule() {
    return this.dashboardService.getTodaysSchedule(DEFAULT_PRACTICE_ID);
  }

  @Get('activity')
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentActivity(
      DEFAULT_PRACTICE_ID,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('practice')
  async getPracticeInfo() {
    return this.dashboardService.getPracticeInfo(DEFAULT_PRACTICE_ID);
  }
}
