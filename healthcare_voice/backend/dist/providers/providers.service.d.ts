import { PrismaService } from '../prisma/prisma.service';
export declare class ProvidersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(practiceId: string, filters?: {
        specialization?: string;
        activeOnly?: boolean;
    }): Promise<({
        department: {
            name: string;
        };
        schedules: {
            createdAt: Date;
            providerId: string;
            endTime: string;
            dayOfWeek: number;
            scheduleId: string;
            startTime: string;
            isAvailable: boolean;
            location: string | null;
        }[];
    } & {
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.ProviderType;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean;
        telehealthEnabled: boolean;
        defaultAppointmentDuration: number;
        scheduleBuffer: number;
    })[]>;
    findOne(providerId: string): Promise<{
        department: {
            name: string;
        };
        schedules: {
            createdAt: Date;
            providerId: string;
            endTime: string;
            dayOfWeek: number;
            scheduleId: string;
            startTime: string;
            isAvailable: boolean;
            location: string | null;
        }[];
    } & {
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.ProviderType;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean;
        telehealthEnabled: boolean;
        defaultAppointmentDuration: number;
        scheduleBuffer: number;
    }>;
    findByName(name: string, practiceId: string): Promise<{
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.ProviderType;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean;
        telehealthEnabled: boolean;
        defaultAppointmentDuration: number;
        scheduleBuffer: number;
    }>;
    getSchedule(providerId: string): Promise<{
        createdAt: Date;
        providerId: string;
        endTime: string;
        dayOfWeek: number;
        scheduleId: string;
        startTime: string;
        isAvailable: boolean;
        location: string | null;
    }[]>;
    getTimeOff(providerId: string, startDate: Date, endDate: Date): Promise<{
        createdAt: Date;
        providerId: string;
        timeOffId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
    }[]>;
    getAppointments(providerId: string, date?: string): Promise<({
        patient: {
            firstName: string;
            lastName: string;
            phonePrimary: string;
        };
        service: {
            name: string;
        };
    } & {
        practiceId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        notes: string | null;
        providerId: string;
        appointmentId: string;
        serviceId: string | null;
        appointmentType: import(".prisma/client").$Enums.AppointmentType;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        scheduledDate: Date;
        scheduledTime: string;
        endTime: string | null;
        duration: number;
        room: string | null;
        chiefComplaint: string | null;
        internalNotes: string | null;
        isRecurring: boolean;
        recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
        parentAppointmentId: string | null;
        confirmationSent: boolean;
        confirmationSentAt: Date | null;
        reminderSent: boolean;
        reminderSentAt: Date | null;
        checkedInAt: Date | null;
        startedAt: Date | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
        cancellationReason: string | null;
        rescheduledFromId: string | null;
        rescheduledToId: string | null;
        telehealthLink: string | null;
        createdBy: string | null;
        createdVia: string;
    })[]>;
}
