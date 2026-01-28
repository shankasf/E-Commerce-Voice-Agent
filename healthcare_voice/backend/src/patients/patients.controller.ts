import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';

const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.patientsService.findAll(DEFAULT_PRACTICE_ID, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post('search/phone')
  async findByPhone(@Body() body: { phone: string }) {
    return this.patientsService.findByPhone(body.phone, DEFAULT_PRACTICE_ID);
  }

  @Post('search/name-dob')
  async findByNameDob(
    @Body() body: { firstName: string; lastName: string; dateOfBirth: string },
  ) {
    return this.patientsService.findByNameDob(
      body.firstName,
      body.lastName,
      body.dateOfBirth,
      DEFAULT_PRACTICE_ID,
    );
  }

  @Post()
  async create(@Body() data: any) {
    return this.patientsService.create({
      ...data,
      practiceId: DEFAULT_PRACTICE_ID,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.patientsService.update(id, data);
  }

  @Get(':id/appointments')
  async getAppointments(
    @Param('id') id: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.patientsService.getAppointments(id, upcoming !== 'false');
  }

  @Get(':id/insurance')
  async getInsurance(@Param('id') id: string) {
    return this.patientsService.getInsurance(id);
  }
}
