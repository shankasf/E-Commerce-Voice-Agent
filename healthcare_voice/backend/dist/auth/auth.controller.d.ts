import { AuthService } from './auth.service';
declare class LoginDto {
    email: string;
    password: string;
}
declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    practiceId: string;
    role?: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        user: {
            userId: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.user_role;
            practiceId: string;
            practiceName: string;
        };
        token: string;
    }>;
    register(dto: RegisterDto): Promise<{
        user: {
            userId: string;
            email: string;
            practiceId: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.user_role;
        };
        token: string;
    }>;
    getProfile(req: any): Promise<{
        userId: string;
        email: string;
        practiceId: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.user_role;
        isActive: boolean;
    }>;
}
export {};
