/**
 * Customer Tools - Shared across agents for customer management
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert, update } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Customer Management
// ─────────────────────────────────────────────────────────────────────────────

export const createCustomerProfile = tool({
    name: 'create_customer_profile',
    description: 'Create a new customer profile. Required before booking parties or orders.',
    parameters: z.object({
        full_name: z.string().describe('Customer full name'),
        email: z.string().optional().describe('Email address'),
        phone: z.string().optional().describe('Phone number'),
        guardian_name: z.string().optional().describe('Guardian/parent name'),
        child_name: z.string().optional().describe('Child name'),
        child_birthdate: z.string().optional().describe('Child birthdate (YYYY-MM-DD)'),
        notes: z.string().optional().describe('Additional notes'),
    }),
    execute: async (params) => {
        const customer = await insert('customers', params);
        return JSON.stringify({ success: true, customer });
    },
});

export const searchCustomers = tool({
    name: 'search_customers',
    description: 'Search for existing customers by name, email, or phone.',
    parameters: z.object({
        query: z.string().describe('Search term (name, email, or phone)'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ query: searchTerm, limit }) => {
        let data = await query('customers', { limit: limit || 10 });

        const lower = searchTerm.toLowerCase();
        data = data.filter(c =>
            c.full_name?.toLowerCase().includes(lower) ||
            c.email?.toLowerCase().includes(lower) ||
            c.phone?.includes(searchTerm) ||
            c.child_name?.toLowerCase().includes(lower)
        );

        return JSON.stringify(data);
    },
});

export const getCustomerDetails = tool({
    name: 'get_customer_details',
    description: 'Get full customer profile by ID.',
    parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
    }),
    execute: async ({ customer_id }) => {
        const customers = await query('customers', { filters: { customer_id } });
        if (!customers.length) return JSON.stringify({ error: 'Customer not found' });
        return JSON.stringify(customers[0]);
    },
});

export const updateCustomerProfile = tool({
    name: 'update_customer_profile',
    description: 'Update an existing customer profile.',
    parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        full_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        guardian_name: z.string().optional(),
        child_name: z.string().optional(),
        child_birthdate: z.string().optional(),
        notes: z.string().optional(),
    }),
    execute: async ({ customer_id, ...updates }) => {
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        if (!Object.keys(filtered).length) {
            return JSON.stringify({ error: 'No updates provided' });
        }
        const updated = await update('customers', { customer_id }, filtered);
        return JSON.stringify({ success: true, customer: updated[0] });
    },
});

export const listCustomerOrders = tool({
    name: 'list_customer_orders',
    description: 'List all orders for a customer.',
    parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ customer_id, limit }) => {
        const orders = await query('orders', {
            filters: { customer_id },
            order: { column: 'created_at', ascending: false },
            limit: limit || 10,
        });
        return JSON.stringify(orders);
    },
});

export const listCustomerBookings = tool({
    name: 'list_customer_bookings',
    description: 'List all party bookings for a customer.',
    parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ customer_id, limit }) => {
        const bookings = await query('party_bookings', {
            filters: { customer_id },
            order: { column: 'scheduled_start', ascending: false },
            limit: limit || 10,
        });
        return JSON.stringify(bookings);
    },
});

// Export all customer tools
export const customerTools = [
    createCustomerProfile,
    searchCustomers,
    getCustomerDetails,
    updateCustomerProfile,
    listCustomerOrders,
    listCustomerBookings,
];
