import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { customer: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: { phone },
      include: { customer: true },
    });
  }

  async updateProfile(userId: string, data: { full_name?: string; phone?: string; avatar_url?: string }) {
    return this.prisma.user.update({
      where: { user_id: userId },
      data,
    });
  }

  async findAll(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      select: {
        user_id: true,
        email: true,
        phone: true,
        full_name: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });
  }
}
