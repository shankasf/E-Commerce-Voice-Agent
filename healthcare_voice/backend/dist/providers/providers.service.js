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
exports.ProvidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProvidersService = class ProvidersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(practiceId, filters) {
        const where = { practiceId };
        if (filters?.activeOnly !== false) {
            where.isActive = true;
        }
        if (filters?.specialization) {
            where.specialization = { contains: filters.specialization, mode: 'insensitive' };
        }
        return this.prisma.provider.findMany({
            where,
            include: {
                department: { select: { name: true } },
                schedules: { where: { isAvailable: true }, orderBy: { dayOfWeek: 'asc' } },
            },
            orderBy: { lastName: 'asc' },
        });
    }
    async findOne(providerId) {
        const provider = await this.prisma.provider.findUnique({
            where: { providerId },
            include: {
                department: { select: { name: true } },
                schedules: { orderBy: { dayOfWeek: 'asc' } },
            },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Provider not found');
        }
        return provider;
    }
    async findByName(name, practiceId) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return this.prisma.provider.findFirst({
                where: {
                    practiceId,
                    firstName: { contains: parts[0], mode: 'insensitive' },
                    lastName: { contains: parts[parts.length - 1], mode: 'insensitive' },
                },
            });
        }
        return this.prisma.provider.findFirst({
            where: {
                practiceId,
                OR: [
                    { firstName: { contains: name, mode: 'insensitive' } },
                    { lastName: { contains: name, mode: 'insensitive' } },
                ],
            },
        });
    }
    async getSchedule(providerId) {
        return this.prisma.providerSchedule.findMany({
            where: { providerId, isAvailable: true },
            orderBy: { dayOfWeek: 'asc' },
        });
    }
    async getTimeOff(providerId, startDate, endDate) {
        return this.prisma.providerTimeOff.findMany({
            where: {
                providerId,
                endDate: { gte: startDate },
                startDate: { lte: endDate },
            },
        });
    }
    async getAppointments(providerId, date) {
        const where = { providerId };
        if (date) {
            where.scheduledDate = new Date(date);
        }
        else {
            where.scheduledDate = { gte: new Date() };
        }
        where.status = { notIn: ['cancelled', 'no_show'] };
        return this.prisma.appointment.findMany({
            where,
            include: {
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phonePrimary: true,
                    },
                },
                service: {
                    select: { name: true },
                },
            },
            orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        });
    }
};
exports.ProvidersService = ProvidersService;
exports.ProvidersService = ProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProvidersService);
//# sourceMappingURL=providers.service.js.map