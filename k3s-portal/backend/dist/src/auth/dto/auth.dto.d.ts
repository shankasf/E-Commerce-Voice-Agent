export declare enum UserRole {
    admin = "admin",
    operator = "operator",
    viewer = "viewer"
}
export declare class GoogleUserDto {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
}
export declare class UserResponseDto {
    id: number;
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
}
export declare class AuthResponseDto {
    accessToken: string;
    user: UserResponseDto;
}
