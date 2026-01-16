export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  icon: string;
  examples: string[];
  features?: string[];
}

export type ServiceCategory =
  | "domains"
  | "compute"
  | "serverless"
  | "storage"
  | "databases"
  | "cache"
  | "queues"
  | "networking"
  | "cdn"
  | "security"
  | "observability"
  | "cicd";

export interface ServiceCategoryInfo {
  id: ServiceCategory;
  name: string;
  description: string;
  icon: string;
}

export interface ArchitectureModule {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  estimatedCost: {
    min: number;
    max: number;
  };
}

export interface PlanResult {
  modules: ArchitectureModule[];
  totalEstimate: {
    min: number;
    max: number;
  };
  tier: "starter" | "growth" | "scale" | "enterprise";
  steps: string[];
}

export interface WaitlistFormData {
  fullName: string;
  email: string;
  company: string;
  role: string;
  useCase: string;
  expectedScale: string;
  consent: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar?: string;
}
