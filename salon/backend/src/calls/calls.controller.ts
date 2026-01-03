import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all call logs' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.callsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get call statistics' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Default to last 30 days if dates not provided or invalid
    const end = endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date();
    const start = startDate && !isNaN(Date.parse(startDate)) 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.callsService.getStats(start, end);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get Eleven Labs usage statistics' })
  async getUsageStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Default to last 30 days if dates not provided or invalid
    const end = endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date();
    const start = startDate && !isNaN(Date.parse(startDate)) 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.callsService.getUsageStats(start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call log by ID' })
  async findById(@Param('id') id: string) {
    return this.callsService.findById(id);
  }
}
