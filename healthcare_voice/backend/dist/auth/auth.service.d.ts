import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        practiceId: string;
        role?: string;
    }): Promise<{
        user: {
            userId: string;
            email: string;
            practiceId: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        token: string;
    }>;
    login(email: string, password: string): Promise<{
        user: {
            userId: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            practiceId: string;
            practiceName: string;
        };
        token: string;
    }>;
    validateUser(userId: string): Promise<{
        userId: string;
        email: string;
        practiceId: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }>;
    private generateToken;
}
