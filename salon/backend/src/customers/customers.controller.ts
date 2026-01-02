import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all customers (admin only)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile' })
  async getMyProfile(@Request() req) {
    const customer = await this.customersService['prisma'].customer.findFirst({
      where: { user_id: req.user.userId },
    });

    if (!customer) {
      return null;
    }

    return this.customersService.findById(customer.customer_id);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current customer stats' })
  async getMyStats(@Request() req) {
    const customer = await this.customersService['prisma'].customer.findFirst({
      where: { user_id: req.user.userId },
    });

    if (!customer) {
      return { total_visits: 0, total_spent: 0, loyalty_points: 0, upcoming_appointments: 0 };
    }

    return this.customersService.getStats(customer.customer_id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get customer by ID (admin only)' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update customer (admin only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{
      notes: string;
      allergies: string;
      preferences: string;
      preferred_stylist_id: number;
      is_vip: boolean;
    }>,
  ) {
    return this.customersService.update(id, data);
  }

  @Post('me/favorites/:serviceId')
  @ApiOperation({ summary: 'Add service to favorites' })
  async addFavorite(@Request() req, @Param('serviceId', ParseIntPipe) serviceId: number) {
    const customer = await this.customersService['prisma'].customer.findFirst({
      where: { user_id: req.user.userId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.customersService.addFavorite(customer.customer_id, serviceId);
  }

  @Delete('me/favorites/:serviceId')
  @ApiOperation({ summary: 'Remove service from favorites' })
  async removeFavorite(@Request() req, @Param('serviceId', ParseIntPipe) serviceId: number) {
    const customer = await this.customersService['prisma'].customer.findFirst({
      where: { user_id: req.user.userId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.customersService.removeFavorite(customer.customer_id, serviceId);
  }
}
