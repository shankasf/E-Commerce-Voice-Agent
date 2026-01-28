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
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PatientsService = class PatientsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(practiceId, params) {
        const { skip = 0, take = 50, search } = params || {};
        const where = { practiceId };
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phonePrimary: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
                { mrn: { contains: search } },
            ];
        }
        const [patients, total] = await Promise.all([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                orderBy: { lastName: 'asc' },
                select: {
                    patientId: true,
                    mrn: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    phonePrimary: true,
                    email: true,
                    isActive: true,
                },
            }),
            this.prisma.patient.count({ where }),
        ]);
        return { patients, total };
    }
    async findOne(patientId) {
        const patient = await this.prisma.patient.findUnique({
            where: { patientId },
            include: {
                insurance: true,
                preferredProvider: {
                    select: {
                        providerId: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        specialization: true,
                    },
                },
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Patient not found');
        }
        return patient;
    }
    async findByPhone(phone, practiceId) {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        return this.prisma.patient.findFirst({
            where: {
                practiceId,
                OR: [
                    { phonePrimary: { contains: cleanPhone } },
                    { phoneSecondary: { contains: cleanPhone } },
                    { phoneWork: { contains: cleanPhone } },
                ],
            },
        });
    }
    async findByNameDob(firstName, lastName, dob, practiceId) {
        return this.prisma.patient.findFirst({
            where: {
                practiceId,
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
                dateOfBirth: new Date(dob),
            },
        });
    }
    async create(data) {
        return this.prisma.patient.create({
            data: {
                ...data,
                dateOfBirth: new Date(data.dateOfBirth),
            },
        });
    }
    async update(patientId, data) {
        if (data.dateOfBirth) {
            data.dateOfBirth = new Date(data.dateOfBirth);
        }
        return this.prisma.patient.update({
            where: { patientId },
            data,
        });
    }
    async getAppointments(patientId, upcoming = true) {
        const where = { patientId };
        if (upcoming) {
            where.scheduledDate = { gte: new Date() };
            where.status = { notIn: ['cancelled', 'no_show', 'completed'] };
        }
        return this.prisma.appointment.findMany({
            where,
            include: {
                provider: {
                    select: {
                        firstName: true,
                        lastName: true,
                        title: true,
                        specialization: true,
                    },
                },
                service: {
                    select: {
                        name: true,
                        duration: true,
                    },
                },
            },
            orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        });
    }
    async getInsurance(patientId) {
        return this.prisma.patientInsurance.findMany({
            where: { patientId, isActive: true },
        });
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PatientsService);
//# sourceMappingURL=patients.service.js.map