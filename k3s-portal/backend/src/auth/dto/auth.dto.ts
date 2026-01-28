import { IsString, MinLength } from 'class-validator';

export enum UserRole {
  admin = 'admin',
  operator = 'operator',
  viewer = 'viewer',
}

export class LoginDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class UserResponseDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
