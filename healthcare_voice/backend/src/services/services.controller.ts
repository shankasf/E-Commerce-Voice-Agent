import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  async findAll(@Request() req, @Query('category') category?: string) {
    return this.servicesService.findAll(req.user.practiceId, category);
  }

  @Get('categories')
  async getCategories(@Request() req) {
    return this.servicesService.getCategories(req.user.practiceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }
}
