import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(practiceId: string, params?: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 50, search } = params || {};

    const where: any = { practiceId };

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

  async findOne(patientId: string) {
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
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async findByPhone(phone: string, practiceId: string) {
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

  async findByNameDob(firstName: string, lastName: string, dob: string, practiceId: string) {
    return this.prisma.patient.findFirst({
      where: {
        practiceId,
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
        dateOfBirth: new Date(dob),
      },
    });
  }

  async create(data: any) {
    return this.prisma.patient.create({
      data: {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth),
      },
    });
  }

  async update(patientId: string, data: any) {
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { patientId },
      data,
    });
  }

  async getAppointments(patientId: string, upcoming = true) {
    const where: any = { patientId };

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

  async getInsurance(patientId: string) {
    return this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
    });
  }
}
