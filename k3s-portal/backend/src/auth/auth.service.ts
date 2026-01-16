import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, UserResponseDto, AuthResponseDto, UserRole } from './dto/auth.dto';

// Hardcoded admin credentials
const ADMIN_USER = {
  id: 1,
  username: 'admin',
  password: 'admin123',
  email: 'admin@k8s-portal.local',
  fullName: 'Administrator',
  role: UserRole.admin,
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // Validate against hardcoded credentials
    if (username !== ADMIN_USER.username || password !== ADMIN_USER.password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!ADMIN_USER.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const payload = {
      sub: ADMIN_USER.id,
      username: ADMIN_USER.username,
      email: ADMIN_USER.email,
      role: ADMIN_USER.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.toUserResponse(),
    };
  }

  async validateUserById(userId: number): Promise<UserResponseDto | null> {
    if (userId !== ADMIN_USER.id || !ADMIN_USER.isActive) {
      return null;
    }
    return this.toUserResponse();
  }

  async getProfile(userId: number): Promise<UserResponseDto> {
    if (userId !== ADMIN_USER.id) {
      throw new UnauthorizedException('User not found');
    }
    return this.toUserResponse();
  }

  private toUserResponse(): UserResponseDto {
    return {
      id: ADMIN_USER.id,
      username: ADMIN_USER.username,
      email: ADMIN_USER.email,
      fullName: ADMIN_USER.fullName,
      role: ADMIN_USER.role,
      isActive: ADMIN_USER.isActive,
      lastLoginAt: new Date(),
      createdAt: ADMIN_USER.createdAt,
    };
  }
}
