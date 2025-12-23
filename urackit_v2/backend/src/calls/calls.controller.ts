import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CallQueryDto } from './dto/call.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Get()
  @ApiOperation({ summary: 'List call logs with pagination and filters' })
  async findAll(@Query() query: CallQueryDto) {
    return this.callsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get call statistics' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', '30d', '90d'] })
  async getStats(@Query('range') range?: string) {
    return this.callsService.getStats(range);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get AI agent usage distribution' })
  @ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d'] })
  async getAgentDistribution(@Query('range') range?: string) {
    return this.callsService.getAgentDistribution(range);
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Get hourly call distribution' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD format' })
  async getHourlyDistribution(@Query('date') date?: string) {
    return this.callsService.getHourlyDistribution(date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call details with transcript and interactions' })
  async findOne(@Param('id') id: string) {
    return this.callsService.findOne(id);
  }
}
