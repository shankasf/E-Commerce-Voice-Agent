import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        full_name: data.full_name,
        phone: data.phone,
        role: 'customer',
      },
    });

    // Create customer record
    await this.prisma.customer.create({
      data: {
        user_id: user.user_id,
      },
    });

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        customer: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return consistent format with login response
    return {
      id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      customer: user.customer,
    };
  }
}
