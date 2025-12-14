/**
 * Party Agent Tools - Packages, bookings, reschedules, guests, addons
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert, update } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Party Packages
// ─────────────────────────────────────────────────────────────────────────────

export const listPartyPackages = tool({
    name: 'list_party_packages',
    description: 'Get available birthday party packages and pricing.',
    parameters: z.object({
        location_name: z.string().optional().describe('Optional location filter'),
    }),
    execute: async ({ location_name }) => {
        let data = await query('party_packages', { filters: { is_active: true } });

        if (location_name) {
            const locations = await query('locations', { ilike: { name: location_name } });
            const locationIds = locations.map(l => l.location_id);
            data = data.filter(p => !p.location_id || locationIds.includes(p.location_id));
        }

        return JSON.stringify(data);
    },
});

export const getPackageInclusions = tool({
    name: 'get_package_inclusions',
    description: 'Get what is included in a party package.',
    parameters: z.object({
        package_id: z.number().describe('Package ID'),
    }),
    execute: async ({ package_id }) => {
        const data = await query('package_inclusions', { filters: { package_id } });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Party Availability
// ─────────────────────────────────────────────────────────────────────────────

export const getPartyAvailability = tool({
    name: 'get_party_availability',
    description: 'Check booked party slots within a time window to find availability.',
    parameters: z.object({
        start_datetime: z.string().describe('Window start (ISO datetime)'),
        end_datetime: z.string().describe('Window end (ISO datetime)'),
        resource_id: z.number().optional().describe('Optional specific room/resource'),
    }),
    execute: async ({ start_datetime, end_datetime, resource_id }) => {
        // Get all bookings that overlap with the window
        let bookings = await query('party_bookings', {
            filters: resource_id ? { resource_id } : {},
        });

        // Filter to those overlapping the time window
        const start = new Date(start_datetime);
        const end = new Date(end_datetime);

        bookings = bookings.filter(b => {
            const bStart = new Date(b.scheduled_start);
            const bEnd = new Date(b.scheduled_end);
            return bStart < end && bEnd > start && b.status !== 'Cancelled';
        });

        return JSON.stringify({
            booked_slots: bookings.map(b => ({
                booking_id: b.booking_id,
                resource_id: b.resource_id,
                scheduled_start: b.scheduled_start,
                scheduled_end: b.scheduled_end,
                status: b.status,
            })),
        });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Party Bookings
// ─────────────────────────────────────────────────────────────────────────────

export const createPartyBooking = tool({
    name: 'create_party_booking',
    description: 'Create a new birthday party booking. Requires customer info first.',
    parameters: z.object({
        package_id: z.number().describe('Party package ID'),
        resource_id: z.number().describe('Room/resource ID'),
        customer_id: z.number().describe('Customer ID'),
        scheduled_start: z.string().describe('Start datetime (ISO)'),
        scheduled_end: z.string().describe('End datetime (ISO)'),
        additional_kids: z.number().optional().describe('Extra kids beyond base'),
        additional_guests: z.number().optional().describe('Extra adult guests'),
        special_requests: z.string().optional().describe('Special requests/notes'),
    }),
    execute: async (params) => {
        const booking = await insert('party_bookings', {
            package_id: params.package_id,
            resource_id: params.resource_id,
            customer_id: params.customer_id,
            scheduled_start: params.scheduled_start,
            scheduled_end: params.scheduled_end,
            additional_kids: params.additional_kids || 0,
            additional_guests: params.additional_guests || 0,
            special_requests: params.special_requests,
            status: 'Pending',
        });
        return JSON.stringify({ success: true, booking });
    },
});

export const updatePartyBooking = tool({
    name: 'update_party_booking',
    description: 'Update an existing party booking (status, guests, requests).',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
        status: z.string().optional().describe('New status'),
        additional_kids: z.number().optional(),
        additional_guests: z.number().optional(),
        special_requests: z.string().optional(),
    }),
    execute: async ({ booking_id, ...updates }) => {
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        if (!Object.keys(filtered).length) {
            return JSON.stringify({ error: 'No updates provided' });
        }
        const updated = await update('party_bookings', { booking_id }, filtered);
        return JSON.stringify({ success: true, booking: updated[0] });
    },
});

export const getBookingDetails = tool({
    name: 'get_booking_details',
    description: 'Get full details of a party booking.',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
    }),
    execute: async ({ booking_id }) => {
        const bookings = await query('party_bookings', { filters: { booking_id } });
        if (!bookings.length) return JSON.stringify({ error: 'Booking not found' });

        const booking = bookings[0];
        const guests = await query('party_guests', { filters: { booking_id } });
        const addons = await query('party_addons', { filters: { booking_id } });
        const reschedules = await query('party_reschedules', { filters: { booking_id } });

        return JSON.stringify({ booking, guests, addons, reschedules });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Party Reschedule
// ─────────────────────────────────────────────────────────────────────────────

export const rescheduleParty = tool({
    name: 'reschedule_party',
    description: 'Reschedule a party booking to new date/time.',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
        new_start: z.string().describe('New start datetime (ISO)'),
        new_end: z.string().describe('New end datetime (ISO)'),
        reason: z.string().optional().describe('Reason for reschedule'),
    }),
    execute: async ({ booking_id, new_start, new_end, reason }) => {
        // Get current booking
        const bookings = await query('party_bookings', { filters: { booking_id } });
        if (!bookings.length) return JSON.stringify({ error: 'Booking not found' });

        const booking = bookings[0];

        // Record reschedule
        await insert('party_reschedules', {
            booking_id,
            old_start: booking.scheduled_start,
            old_end: booking.scheduled_end,
            new_start,
            new_end,
            reason,
        });

        // Update booking
        const updated = await update('party_bookings', { booking_id }, {
            scheduled_start: new_start,
            scheduled_end: new_end,
            status: 'Rescheduled',
        });

        return JSON.stringify({ success: true, booking: updated[0] });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Party Guests
// ─────────────────────────────────────────────────────────────────────────────

export const addPartyGuest = tool({
    name: 'add_party_guest',
    description: 'Add a guest to a party booking.',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
        guest_name: z.string().describe('Guest name'),
        is_child: z.boolean().optional().describe('Is this a child? (default true)'),
    }),
    execute: async ({ booking_id, guest_name, is_child }) => {
        const guest = await insert('party_guests', {
            booking_id,
            guest_name,
            is_child: is_child !== false,
        });
        return JSON.stringify({ success: true, guest });
    },
});

export const listPartyGuests = tool({
    name: 'list_party_guests',
    description: 'List guests for a party booking.',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
    }),
    execute: async ({ booking_id }) => {
        const guests = await query('party_guests', { filters: { booking_id } });
        return JSON.stringify(guests);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Party Addons
// ─────────────────────────────────────────────────────────────────────────────

export const addPartyAddon = tool({
    name: 'add_party_addon',
    description: 'Add an addon item to a party booking.',
    parameters: z.object({
        booking_id: z.number().describe('Booking ID'),
        product_id: z.number().optional().describe('Product ID if from catalog'),
        name: z.string().optional().describe('Custom addon name'),
        quantity: z.number().optional().describe('Quantity (default 1)'),
        unit_price_usd: z.number().describe('Price per unit'),
    }),
    execute: async ({ booking_id, product_id, name, quantity, unit_price_usd }) => {
        const addon = await insert('party_addons', {
            booking_id,
            product_id,
            name,
            quantity: quantity || 1,
            unit_price_usd,
        });
        return JSON.stringify({ success: true, addon });
    },
});

// Export all party tools
export const partyTools = [
    listPartyPackages,
    getPackageInclusions,
    getPartyAvailability,
    createPartyBooking,
    updatePartyBooking,
    getBookingDetails,
    rescheduleParty,
    addPartyGuest,
    listPartyGuests,
    addPartyAddon,
];
