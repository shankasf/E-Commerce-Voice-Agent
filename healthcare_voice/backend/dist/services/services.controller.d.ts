import { ServicesService } from './services.service';
export declare class ServicesController {
    private servicesService;
    constructor(servicesService: ServicesService);
    findAll(req: any, category?: string): Promise<({
        category: {
            name: string;
        };
    } & {
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        serviceId: string;
        duration: number;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean;
        requiresPriorAuth: boolean;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    })[]>;
    getCategories(req: any): Promise<{
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        categoryId: string;
        description: string | null;
        displayOrder: number;
    }[]>;
    findOne(id: string): Promise<{
        category: {
            practiceId: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            categoryId: string;
            description: string | null;
            displayOrder: number;
        };
    } & {
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        serviceId: string;
        duration: number;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean;
        requiresPriorAuth: boolean;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    }>;
}
