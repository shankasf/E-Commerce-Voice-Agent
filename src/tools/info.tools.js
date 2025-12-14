/**
 * Info Agent Tools - FAQs, policies, locations, staff, testimonials, company info
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// FAQs
// ─────────────────────────────────────────────────────────────────────────────

export const listFaqs = tool({
    name: 'list_faqs',
    description: 'List frequently asked questions and answers.',
    parameters: z.object({
        only_active: z.boolean().optional().describe('If true, only active FAQs'),
    }),
    execute: async ({ only_active }) => {
        const filters = only_active !== false ? { is_active: true } : {};
        const data = await query('faqs', { filters });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Policies
// ─────────────────────────────────────────────────────────────────────────────

export const getStorePolicies = tool({
    name: 'get_store_policies',
    description: 'Retrieve active store policies (grip socks, waivers, age rules, etc.).',
    parameters: z.object({
        topic: z.string().optional().describe('Optional keyword to filter policies'),
    }),
    execute: async ({ topic }) => {
        let data = await query('policies', { filters: { is_active: true } });
        if (topic) {
            const lower = topic.toLowerCase();
            data = data.filter(p => p.key.toLowerCase().includes(lower) || (p.value && p.value.toLowerCase().includes(lower)));
        }
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Locations
// ─────────────────────────────────────────────────────────────────────────────

export const listStoreLocations = tool({
    name: 'list_store_locations',
    description: 'List store locations and contact details.',
    parameters: z.object({
        only_active: z.boolean().optional().describe('If true, only show active locations'),
    }),
    execute: async ({ only_active }) => {
        const filters = only_active !== false ? { is_active: true } : {};
        const data = await query('locations', { filters });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────────

export const listStaff = tool({
    name: 'list_staff',
    description: 'List staff with roles and contact info.',
    parameters: z.object({
        only_active: z.boolean().optional().describe('If true, only active staff'),
    }),
    execute: async ({ only_active }) => {
        const filters = only_active !== false ? { is_active: true } : {};
        const data = await query('staff', { filters });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────────────────────────────────────

export const listTestimonials = tool({
    name: 'list_testimonials',
    description: 'List recent customer testimonials.',
    parameters: z.object({
        limit: z.number().optional().describe('Max testimonials to return (1-10)'),
    }),
    execute: async ({ limit }) => {
        const data = await query('testimonials', {
            order: { column: 'created_at', ascending: false },
            limit: limit || 5,
        });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Company Info
// ─────────────────────────────────────────────────────────────────────────────

export const getCompanyInfo = tool({
    name: 'get_company_info',
    description: 'Get company name, mission, and values.',
    parameters: z.object({}),
    execute: async () => {
        const data = await query('company', { limit: 1 });
        return JSON.stringify(data[0] || {});
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Resources (play areas, party rooms)
// ─────────────────────────────────────────────────────────────────────────────

export const listResources = tool({
    name: 'list_resources',
    description: 'List available resources like party rooms and play areas.',
    parameters: z.object({
        type: z.string().optional().describe('Filter by type: PartyRoom, PlayArea'),
        only_active: z.boolean().optional(),
    }),
    execute: async ({ type, only_active }) => {
        const filters = only_active !== false ? { is_active: true } : {};
        if (type) filters.type = type;
        const data = await query('resources', { filters });
        return JSON.stringify(data);
    },
});

// Export all info tools
export const infoTools = [
    listFaqs,
    getStorePolicies,
    listStoreLocations,
    listStaff,
    listTestimonials,
    getCompanyInfo,
    listResources,
];
