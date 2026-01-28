import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';

const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';

@Controller('call-logs')
export class CallLogsController {
  constructor(private callLogsService: CallLogsService) {}

  @Get()
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.callLogsService.findAll(DEFAULT_PRACTICE_ID, {
      patientId,
      startDate,
      endDate,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('stats')
  async getStats(@Query('days') days?: string) {
    return this.callLogsService.getStats(DEFAULT_PRACTICE_ID, days ? parseInt(days) : 7);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.callLogsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.callLogsService.create({
      ...data,
      practiceId: DEFAULT_PRACTICE_ID,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.callLogsService.update(id, data);
  }
}
