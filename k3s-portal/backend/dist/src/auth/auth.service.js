"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const auth_dto_1 = require("./dto/auth.dto");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async findOrCreateGoogleUser(googleUser) {
        let user = await this.prisma.user.findUnique({
            where: { googleId: googleUser.googleId },
        });
        if (!user) {
            const existingUserByEmail = await this.prisma.user.findUnique({
                where: { email: googleUser.email },
            });
            if (existingUserByEmail) {
                user = await this.prisma.user.update({
                    where: { email: googleUser.email },
                    data: {
                        googleId: googleUser.googleId,
                        avatarUrl: googleUser.avatarUrl,
                        lastLoginAt: new Date(),
                    },
                });
            }
            else {
                const userCount = await this.prisma.user.count();
                const role = userCount === 0 ? auth_dto_1.UserRole.admin : auth_dto_1.UserRole.viewer;
                user = await this.prisma.user.create({
                    data: {
                        googleId: googleUser.googleId,
                        email: googleUser.email,
                        fullName: googleUser.fullName,
                        avatarUrl: googleUser.avatarUrl,
                        role,
                        lastLoginAt: new Date(),
                    },
                });
            }
        }
        else {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    avatarUrl: googleUser.avatarUrl || user.avatarUrl,
                },
            });
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('User account is deactivated');
        }
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);
        return {
            accessToken,
            user: this.toUserResponse(user),
        };
    }
    async validateUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.isActive) {
            return null;
        }
        return this.toUserResponse(user);
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.toUserResponse(user);
    }
    toUserResponse(user) {
        return {
            id: user.id,
            googleId: user.googleId,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || undefined,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt || undefined,
            createdAt: user.createdAt,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map