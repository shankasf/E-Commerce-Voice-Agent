import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, category?: string) {
    const where: any = { practiceId, isActive: true };

    if (category) {
      where.category = { name: { contains: category, mode: 'insensitive' } };
    }

    return this.prisma.service.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(serviceId: string) {
    return this.prisma.service.findUnique({
      where: { serviceId },
      include: { category: true },
    });
  }

  async getCategories(practiceId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { practiceId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
