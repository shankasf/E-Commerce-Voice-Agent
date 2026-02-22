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
            createdAt: Date | null;
            providerId: string;
            endTime: Date;
            dayOfWeek: number;
            scheduleId: string;
            startTime: Date;
            isAvailable: boolean | null;
            location: string | null;
        }[];
    } & {
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.provider_type;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean | null;
        telehealthEnabled: boolean | null;
        defaultAppointmentDuration: number | null;
        scheduleBuffer: number | null;
    })[]>;
    findOne(providerId: string): Promise<{
        department: {
            name: string;
        };
        schedules: {
            createdAt: Date | null;
            providerId: string;
            endTime: Date;
            dayOfWeek: number;
            scheduleId: string;
            startTime: Date;
            isAvailable: boolean | null;
            location: string | null;
        }[];
    } & {
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.provider_type;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean | null;
        telehealthEnabled: boolean | null;
        defaultAppointmentDuration: number | null;
        scheduleBuffer: number | null;
    }>;
    findByName(name: string, practiceId: string): Promise<{
        email: string | null;
        practiceId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        npiNumber: string | null;
        providerId: string;
        departmentId: string | null;
        title: string | null;
        providerType: import(".prisma/client").$Enums.provider_type;
        specialization: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        bio: string | null;
        photoUrl: string | null;
        acceptingNewPatients: boolean | null;
        telehealthEnabled: boolean | null;
        defaultAppointmentDuration: number | null;
        scheduleBuffer: number | null;
    }>;
    getSchedule(providerId: string): Promise<{
        createdAt: Date | null;
        providerId: string;
        endTime: Date;
        dayOfWeek: number;
        scheduleId: string;
        startTime: Date;
        isAvailable: boolean | null;
        location: string | null;
    }[]>;
    getTimeOff(providerId: string, startDate: Date, endDate: Date): Promise<{
        createdAt: Date | null;
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
        createdAt: Date | null;
        updatedAt: Date | null;
        patientId: string;
        notes: string | null;
        providerId: string;
        appointmentId: string;
        serviceId: string | null;
        appointmentType: import(".prisma/client").$Enums.appointment_type;
        status: import(".prisma/client").$Enums.appointment_status;
        scheduledDate: Date;
        scheduledTime: Date;
        endTime: Date | null;
        duration: number;
        room: string | null;
        chiefComplaint: string | null;
        internalNotes: string | null;
        isRecurring: boolean | null;
        recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
        parentAppointmentId: string | null;
        confirmationSent: boolean | null;
        confirmationSentAt: Date | null;
        reminderSent: boolean | null;
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
        createdVia: string | null;
    })[]>;
}
