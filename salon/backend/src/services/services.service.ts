import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(categoryId?: number, activeOnly = true) {
    return this.prisma.service.findMany({
      where: {
        ...(activeOnly && { is_active: true }),
        ...(categoryId && { category_id: categoryId }),
      },
      include: {
        category: true,
        addons: { where: { is_active: true } },
      },
      orderBy: { display_order: 'asc' },
    });
  }

  async findById(serviceId: number) {
    return this.prisma.service.findUnique({
      where: { service_id: serviceId },
      include: {
        category: true,
        addons: true,
      },
    });
  }

  async getCategories() {
    return this.prisma.serviceCategory.findMany({
      where: { is_active: true },
      include: {
        services: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
      orderBy: { display_order: 'asc' },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    category_id?: number;
    duration_minutes: number;
    price: number;
  }) {
    return this.prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        category_id: data.category_id,
        duration_minutes: data.duration_minutes,
        price: data.price,
      },
    });
  }

  async update(serviceId: number, data: Partial<{
    name: string;
    description: string;
    category_id: number;
    duration_minutes: number;
    price: number;
    is_active: boolean;
  }>) {
    return this.prisma.service.update({
      where: { service_id: serviceId },
      data,
    });
  }

  async delete(serviceId: number) {
    return this.prisma.service.update({
      where: { service_id: serviceId },
      data: { is_active: false },
    });
  }
}
