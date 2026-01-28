import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserResponseDto, AuthResponseDto } from './dto/auth.dto';
interface RequestWithUser extends Request {
    user: AuthResponseDto;
}
export declare class AuthController {
    private authService;
    private configService;
    constructor(authService: AuthService, configService: ConfigService);
    googleLogin(): void;
    googleCallback(req: RequestWithUser, res: Response): void;
    getProfile(user: UserResponseDto): UserResponseDto;
    validateToken(user: UserResponseDto): {
        valid: boolean;
        user: UserResponseDto;
    };
}
export {};
