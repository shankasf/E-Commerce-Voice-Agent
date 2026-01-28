import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';

const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  async findAll(
    @Query('specialization') specialization?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.providersService.findAll(DEFAULT_PRACTICE_ID, {
      specialization,
      activeOnly: activeOnly !== 'false',
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Get(':id/schedule')
  async getSchedule(@Param('id') id: string) {
    return this.providersService.getSchedule(id);
  }

  @Get(':id/time-off')
  async getTimeOff(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.providersService.getTimeOff(id, new Date(startDate), new Date(endDate));
  }

  @Get(':id/appointments')
  async getAppointments(@Param('id') id: string, @Query('date') date?: string) {
    return this.providersService.getAppointments(id, date);
  }
}
