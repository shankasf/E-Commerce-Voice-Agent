import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get appointments (filtered by user role)' })
  async findAll(
    @Request() req,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options: any = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };

    if (date) options.date = new Date(date);
    if (status) options.status = status;

    // If not admin, only show own appointments
    if (req.user.role !== 'admin') {
      // Get customer ID for this user
      const customer = await this.appointmentsService['prisma'].customer.findFirst({
        where: { user_id: req.user.userId },
      });
      if (customer) options.customerId = customer.customer_id;
    }

    return this.appointmentsService.findAll(options);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available appointment slots' })
  async getAvailableSlots(
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('stylistId') stylistId?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      parseInt(serviceId),
      new Date(date),
      stylistId ? parseInt(stylistId) : undefined,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my upcoming appointments' })
  async getMyAppointments(@Request() req, @Query('upcoming') upcoming?: string) {
    const customer = await this.appointmentsService['prisma'].customer.findFirst({
      where: { user_id: req.user.userId },
    });

    if (!customer) {
      return [];
    }

    return this.appointmentsService.getCustomerAppointments(
      customer.customer_id,
      upcoming !== 'false',
    );
  }

  @Get('reference/:ref')
  @ApiOperation({ summary: 'Get appointment by booking reference' })
  async findByReference(@Param('ref') ref: string) {
    return this.appointmentsService.findByReference(ref);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(
    @Request() req,
    @Body() data: {
      stylist_id: number;
      service_ids: number[];
      appointment_date: string;
      start_time: string;
      customer_notes?: string;
    },
  ) {
    // Get customer ID
    let customerId: number;
    
    if (req.user.role === 'admin' && data['customer_id']) {
      customerId = data['customer_id'];
    } else {
      const customer = await this.appointmentsService['prisma'].customer.findFirst({
        where: { user_id: req.user.userId },
      });
      
      if (!customer) {
        // Create customer record
        const newCustomer = await this.appointmentsService['prisma'].customer.create({
          data: { user_id: req.user.userId },
        });
        customerId = newCustomer.customer_id;
      } else {
        customerId = customer.customer_id;
      }
    }

    return this.appointmentsService.create({
      customer_id: customerId,
      stylist_id: data.stylist_id,
      service_ids: data.service_ids,
      appointment_date: new Date(data.appointment_date),
      start_time: new Date(`${data.appointment_date}T${data.start_time}`),
      customer_notes: data.customer_notes,
      booked_via: 'website',
    });
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule an appointment' })
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: {
      appointment_date: string;
      start_time: string;
      stylist_id?: number;
    },
  ) {
    return this.appointmentsService.reschedule(
      id,
      new Date(data.appointment_date),
      new Date(`${data.appointment_date}T${data.start_time}`),
      data.stylist_id,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { reason?: string },
  ) {
    return this.appointmentsService.cancel(id, req.user.userId, data.reason);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update appointment status (admin only)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: string },
  ) {
    return this.appointmentsService.updateStatus(id, data.status);
  }
}
