import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto, TokenResponseDto } from './dto/auth.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        full_name: dto.fullName,
        password_hash: passwordHash,
        role: dto.role || 'agent',
      },
    });

    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number) {
    return this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
      },
    });
  }

  /**
   * Request OTP for email login (admin/agent only)
   */
  async requestOTP(email: string): Promise<{ success: boolean; message: string }> {
    return this.otpService.sendOTP(email);
  }

  /**
   * Verify OTP and complete login (admin/agent only)
   */
  async verifyOTPLogin(email: string, code: string): Promise<TokenResponseDto> {
    // Verify OTP first
    const otpResult = await this.otpService.verifyOTP(email, code);
    if (!otpResult.valid) {
      throw new BadRequestException(otpResult.message);
    }

    // Get user data
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Ensure user is admin or agent
    if (user.role !== 'admin' && user.role !== 'agent') {
      throw new UnauthorizedException('OTP login is only available for admin and agent users');
    }

    // Generate JWT token
    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Requester login with password (requesters use password, not OTP)
   */
  async requesterLogin(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user is a requester
    if (user.role !== 'requester') {
      throw new UnauthorizedException('Please use OTP login for admin/agent accounts');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Get user role by email (used to determine login method)
   */
  async getUserRole(email: string): Promise<{ role: string | null; authMethod: 'otp' | 'password' }> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: { role: true },
    });

    if (!user) {
      return { role: null, authMethod: 'password' };
    }

    // Admin and Agent use OTP, Requester uses password
    const authMethod = user.role === 'admin' || user.role === 'agent' ? 'otp' : 'password';
    return { role: user.role, authMethod };
  }
}
