import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleUserDto, UserResponseDto, AuthResponseDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    findOrCreateGoogleUser(googleUser: GoogleUserDto): Promise<AuthResponseDto>;
    validateUserById(userId: number): Promise<UserResponseDto | null>;
    getProfile(userId: number): Promise<UserResponseDto>;
    private toUserResponse;
}
