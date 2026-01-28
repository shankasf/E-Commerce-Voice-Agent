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
exports.CallLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CallLogsService = class CallLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(practiceId, filters) {
        const where = { practiceId };
        if (filters?.patientId) {
            where.patientId = filters.patientId;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.callLog.findMany({
                where,
                skip: filters?.skip || 0,
                take: filters?.take || 50,
                include: {
                    patient: {
                        select: { firstName: true, lastName: true },
                    },
                    provider: {
                        select: { firstName: true, lastName: true, title: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.callLog.count({ where }),
        ]);
        return { logs, total };
    }
    async findOne(logId) {
        return this.prisma.callLog.findUnique({
            where: { logId },
            include: {
                patient: true,
                provider: true,
                appointment: true,
                agentInteractions: true,
            },
        });
    }
    async create(data) {
        return this.prisma.callLog.create({ data });
    }
    async update(logId, data) {
        return this.prisma.callLog.update({
            where: { logId },
            data,
        });
    }
    async getStats(practiceId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const logs = await this.prisma.callLog.findMany({
            where: {
                practiceId,
                createdAt: { gte: startDate },
            },
            select: {
                status: true,
                direction: true,
                durationSeconds: true,
                resolutionStatus: true,
            },
        });
        const totalCalls = logs.length;
        const completedCalls = logs.filter((l) => l.status === 'completed').length;
        const avgDuration = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / (completedCalls || 1);
        const resolvedCalls = logs.filter((l) => l.resolutionStatus === 'resolved').length;
        return {
            totalCalls,
            completedCalls,
            avgDuration: Math.round(avgDuration),
            resolutionRate: totalCalls ? Math.round((resolvedCalls / totalCalls) * 100) : 0,
            inboundCalls: logs.filter((l) => l.direction === 'inbound').length,
            outboundCalls: logs.filter((l) => l.direction === 'outbound').length,
        };
    }
};
exports.CallLogsService = CallLogsService;
exports.CallLogsService = CallLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CallLogsService);
//# sourceMappingURL=call-logs.service.js.map