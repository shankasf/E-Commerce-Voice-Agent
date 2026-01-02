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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  async findAll(@Query('categoryId') categoryId?: string) {
    return this.servicesService.findAll(categoryId ? parseInt(categoryId) : undefined);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all service categories with services' })
  async getCategories() {
    return this.servicesService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service (admin only)' })
  async create(@Body() data: {
    name: string;
    description?: string;
    category_id?: number;
    duration_minutes: number;
    price: number;
  }) {
    return this.servicesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service (admin only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{
      name: string;
      description: string;
      category_id: number;
      duration_minutes: number;
      price: number;
      is_active: boolean;
    }>,
  ) {
    return this.servicesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service (admin only)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.delete(id);
  }
}
