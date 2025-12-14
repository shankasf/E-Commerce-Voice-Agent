/**
 * Admission Agent Tools - Tickets, waivers, admissions, check-ins
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert, update } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Ticket Types
// ─────────────────────────────────────────────────────────────────────────────

export const getTicketPricing = tool({
    name: 'get_ticket_pricing',
    description: 'Get admission ticket types and pricing, optionally filtered by location.',
    parameters: z.object({
        location_name: z.string().optional().describe('Optional location name filter'),
    }),
    execute: async ({ location_name }) => {
        let data = await query('ticket_types', { filters: { is_active: true } });

        if (location_name) {
            const locations = await query('locations', { ilike: { name: location_name } });
            const locationIds = locations.map(l => l.location_id);
            data = data.filter(t => !t.location_id || locationIds.includes(t.location_id));
        }

        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Waivers
// ─────────────────────────────────────────────────────────────────────────────

export const listWaivers = tool({
    name: 'list_waivers',
    description: 'List signed waivers, optionally by customer.',
    parameters: z.object({
        customer_id: z.number().optional().describe('Filter by customer ID'),
        only_valid: z.boolean().optional().describe('If true, only valid waivers'),
    }),
    execute: async ({ customer_id, only_valid }) => {
        const filters = {};
        if (customer_id) filters.customer_id = customer_id;
        if (only_valid !== false) filters.is_valid = true;
        const data = await query('waivers', { filters });
        return JSON.stringify(data);
    },
});

export const createWaiver = tool({
    name: 'create_waiver',
    description: 'Record a new signed waiver for a customer.',
    parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        ip_address: z.string().optional().describe('IP address of signer'),
        document_url: z.string().optional().describe('URL to signed document'),
        version: z.string().optional().describe('Waiver version (default: v1)'),
    }),
    execute: async ({ customer_id, ip_address, document_url, version }) => {
        const waiver = await insert('waivers', {
            customer_id,
            ip_address,
            document_url,
            version: version || 'v1',
            is_valid: true,
        });
        return JSON.stringify({ success: true, waiver });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Admissions
// ─────────────────────────────────────────────────────────────────────────────

export const createAdmission = tool({
    name: 'create_admission',
    description: 'Issue an admission ticket for a customer visit.',
    parameters: z.object({
        ticket_type_id: z.number().describe('Ticket type ID'),
        customer_id: z.number().optional().describe('Customer ID'),
        location_id: z.number().describe('Location ID'),
        visit_date: z.string().describe('Visit date (YYYY-MM-DD)'),
        price_usd: z.number().describe('Ticket price'),
        waiver_id: z.number().optional().describe('Associated waiver ID'),
    }),
    execute: async ({ ticket_type_id, customer_id, location_id, visit_date, price_usd, waiver_id }) => {
        const admission = await insert('admissions', {
            ticket_type_id,
            customer_id,
            location_id,
            visit_date,
            price_usd,
            waiver_id,
            status: 'Issued',
        });
        return JSON.stringify({ success: true, admission });
    },
});

export const checkInAdmission = tool({
    name: 'check_in_admission',
    description: 'Mark an admission as checked in.',
    parameters: z.object({
        admission_id: z.number().describe('Admission ID to check in'),
    }),
    execute: async ({ admission_id }) => {
        const updated = await update('admissions', { admission_id }, {
            status: 'CheckedIn',
            checked_in_at: new Date().toISOString(),
        });
        return JSON.stringify({ success: true, admission: updated[0] });
    },
});

export const listAdmissions = tool({
    name: 'list_admissions',
    description: 'List admissions, optionally filtered by date or customer.',
    parameters: z.object({
        customer_id: z.number().optional().describe('Filter by customer'),
        visit_date: z.string().optional().describe('Filter by visit date (YYYY-MM-DD)'),
        status: z.string().optional().describe('Filter by status'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ customer_id, visit_date, status, limit }) => {
        const filters = {};
        if (customer_id) filters.customer_id = customer_id;
        if (visit_date) filters.visit_date = visit_date;
        if (status) filters.status = status;
        const data = await query('admissions', {
            filters,
            order: { column: 'visit_date', ascending: false },
            limit: limit || 20,
        });
        return JSON.stringify(data);
    },
});

// Export all admission tools
export const admissionTools = [
    getTicketPricing,
    listWaivers,
    createWaiver,
    createAdmission,
    checkInAdmission,
    listAdmissions,
];
