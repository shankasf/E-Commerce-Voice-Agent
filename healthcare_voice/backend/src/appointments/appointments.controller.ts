import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';

@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  async findAll(
    @Query('date') date?: string,
    @Query('providerId') providerId?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.appointmentsService.findAll(DEFAULT_PRACTICE_ID, {
      date,
      providerId,
      patientId,
      status,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('today')
  async findToday(@Query('providerId') providerId?: string) {
    return this.appointmentsService.findToday(DEFAULT_PRACTICE_ID, providerId);
  }

  @Get('availability')
  async getAvailability(
    @Query('providerId') providerId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      providerId,
      date,
      duration ? parseInt(duration) : 30,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.appointmentsService.create({
      ...data,
      practiceId: DEFAULT_PRACTICE_ID,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.appointmentsService.update(id, data);
  }

  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.appointmentsService.cancel(id, body.reason);
  }

  @Put(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() body: { newDate: string; newTime: string; newProviderId?: string },
  ) {
    return this.appointmentsService.reschedule(id, body.newDate, body.newTime, body.newProviderId);
  }

  @Put(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.appointmentsService.confirm(id);
  }

  @Put(':id/checkin')
  async checkIn(@Param('id') id: string) {
    return this.appointmentsService.checkIn(id);
  }
}
