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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview(practiceId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [todaysAppointments, totalPatients, activeProviders, recentCalls, appointmentsByStatus,] = await Promise.all([
            this.prisma.appointment.count({
                where: {
                    practiceId,
                    scheduledDate: today,
                    status: { notIn: ['cancelled', 'no_show'] },
                },
            }),
            this.prisma.patient.count({
                where: { practiceId, isActive: true },
            }),
            this.prisma.provider.count({
                where: { practiceId, isActive: true },
            }),
            this.prisma.callLog.count({
                where: {
                    practiceId,
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    practiceId,
                    scheduledDate: today,
                },
                _count: true,
            }),
        ]);
        return {
            todaysAppointments,
            totalPatients,
            activeProviders,
            recentCalls,
            appointmentsByStatus: appointmentsByStatus.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {}),
        };
    }
    async getTodaysSchedule(practiceId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.appointment.findMany({
            where: {
                practiceId,
                scheduledDate: today,
                status: { notIn: ['cancelled', 'no_show'] },
            },
            include: {
                patient: {
                    select: { firstName: true, lastName: true, phonePrimary: true },
                },
                provider: {
                    select: { firstName: true, lastName: true, title: true },
                },
                service: {
                    select: { name: true },
                },
            },
            orderBy: { scheduledTime: 'asc' },
        });
    }
    async getRecentActivity(practiceId, limit = 10) {
        const [recentAppointments, recentCalls] = await Promise.all([
            this.prisma.appointment.findMany({
                where: { practiceId },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.callLog.findMany({
                where: { practiceId },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                },
            }),
        ]);
        return {
            recentAppointments,
            recentCalls,
        };
    }
    async getPracticeInfo(practiceId) {
        return this.prisma.practice.findUnique({
            where: { practiceId },
            select: {
                name: true,
                phone: true,
                email: true,
                addressLine1: true,
                city: true,
                state: true,
                zipCode: true,
                officeHours: true,
                emergencyPhone: true,
            },
        });
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map