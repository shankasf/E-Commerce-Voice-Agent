import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StylistsService } from './stylists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Stylists')
@Controller('stylists')
export class StylistsController {
  constructor(private stylistsService: StylistsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stylists' })
  async findAll() {
    return this.stylistsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stylist by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.stylistsService.findById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get stylist availability for a date' })
  async getAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') dateStr: string,
  ) {
    const date = new Date(dateStr);
    return this.stylistsService.getAvailability(id, date);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stylist (admin only)' })
  async create(@Body() data: {
    full_name: string;
    email?: string;
    phone?: string;
    bio?: string;
    specialties?: string[];
  }) {
    return this.stylistsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stylist (admin only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{
      full_name: string;
      email: string;
      phone: string;
      bio: string;
      specialties: string[];
      is_active: boolean;
    }>,
  ) {
    return this.stylistsService.update(id, data);
  }
}
