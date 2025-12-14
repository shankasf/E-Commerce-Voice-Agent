/**
 * Order Agent Tools - Orders, items, payments, refunds, promotions
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert, update } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────────────────────

export const createOrder = tool({
    name: 'create_order',
    description: 'Create a new order for a customer.',
    parameters: z.object({
        customer_id: z.number().optional().describe('Customer ID'),
        location_id: z.number().optional().describe('Location ID'),
        order_type: z.enum(['Retail', 'Admission', 'Party', 'Mixed']).describe('Order type'),
        notes: z.string().optional().describe('Order notes'),
    }),
    execute: async ({ customer_id, location_id, order_type, notes }) => {
        const order = await insert('orders', {
            customer_id,
            location_id,
            order_type,
            notes,
            status: 'Pending',
            subtotal_usd: 0,
            discount_usd: 0,
            tax_usd: 0,
            total_usd: 0,
        });
        return JSON.stringify({ success: true, order });
    },
});

export const getOrderDetails = tool({
    name: 'get_order_details',
    description: 'Get detailed information about a specific order including items and payments.',
    parameters: z.object({
        order_id: z.number().describe('Order ID to look up'),
    }),
    execute: async ({ order_id }) => {
        const orders = await query('orders', { filters: { order_id } });
        if (!orders.length) return JSON.stringify({ error: 'Order not found' });

        const order = orders[0];
        const items = await query('order_items', { filters: { order_id } });
        const payments = await query('payments', { filters: { order_id } });
        const refunds = await query('refunds', { filters: { order_id } });

        return JSON.stringify({ order, items, payments, refunds });
    },
});

export const searchOrders = tool({
    name: 'search_orders',
    description: 'Search orders by status or customer.',
    parameters: z.object({
        status: z.string().optional().describe('Filter by status'),
        customer_id: z.number().optional().describe('Filter by customer ID'),
        order_type: z.string().optional().describe('Filter by order type'),
        limit: z.number().optional().describe('Max results (1-20)'),
    }),
    execute: async ({ status, customer_id, order_type, limit }) => {
        const filters = {};
        if (status) filters.status = status;
        if (customer_id) filters.customer_id = customer_id;
        if (order_type) filters.order_type = order_type;

        const data = await query('orders', {
            filters,
            order: { column: 'created_at', ascending: false },
            limit: limit || 20,
        });
        return JSON.stringify(data);
    },
});

export const updateOrderStatus = tool({
    name: 'update_order_status',
    description: 'Update the status of an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
        status: z.enum(['Pending', 'Paid', 'Cancelled', 'Refunded', 'PartiallyRefunded', 'Fulfilled']).describe('New status'),
    }),
    execute: async ({ order_id, status }) => {
        const updated = await update('orders', { order_id }, {
            status,
            updated_at: new Date().toISOString(),
        });
        return JSON.stringify({ success: true, order: updated[0] });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Order Items
// ─────────────────────────────────────────────────────────────────────────────

export const addOrderItem = tool({
    name: 'add_order_item',
    description: 'Add an item (product, ticket, or party) to an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
        item_type: z.enum(['Product', 'Ticket', 'Party']).describe('Type of item'),
        product_id: z.number().optional().describe('Product ID (for Product type)'),
        ticket_type_id: z.number().optional().describe('Ticket type ID (for Ticket type)'),
        booking_id: z.number().optional().describe('Booking ID (for Party type)'),
        name_override: z.string().optional().describe('Custom name override'),
        quantity: z.number().describe('Quantity'),
        unit_price_usd: z.number().describe('Unit price'),
    }),
    execute: async (params) => {
        const line_total_usd = params.quantity * params.unit_price_usd;

        const item = await insert('order_items', {
            order_id: params.order_id,
            item_type: params.item_type,
            product_id: params.product_id,
            ticket_type_id: params.ticket_type_id,
            booking_id: params.booking_id,
            name_override: params.name_override,
            quantity: params.quantity,
            unit_price_usd: params.unit_price_usd,
            line_total_usd,
        });

        // Recalculate order totals
        await recalculateOrderTotals(params.order_id);

        return JSON.stringify({ success: true, item });
    },
});

export const listOrderItems = tool({
    name: 'list_order_items',
    description: 'List all items in an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
    }),
    execute: async ({ order_id }) => {
        const items = await query('order_items', { filters: { order_id } });
        return JSON.stringify(items);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export const recordPayment = tool({
    name: 'record_payment',
    description: 'Record a payment for an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
        provider: z.string().describe('Payment provider (Square, Stripe, Cash, Card)'),
        provider_payment_id: z.string().optional().describe('Provider transaction ID'),
        amount_usd: z.number().describe('Payment amount'),
        status: z.enum(['Pending', 'Authorized', 'Captured', 'Failed', 'Cancelled']).optional().describe('Payment status'),
    }),
    execute: async ({ order_id, provider, provider_payment_id, amount_usd, status }) => {
        const payment = await insert('payments', {
            order_id,
            provider,
            provider_payment_id,
            amount_usd,
            status: status || 'Captured',
        });

        // Update order status if fully paid
        const order = (await query('orders', { filters: { order_id } }))[0];
        const payments = await query('payments', { filters: { order_id } });
        const totalPaid = payments.reduce((sum, p) => p.status === 'Captured' ? sum + parseFloat(p.amount_usd) : sum, 0);

        if (totalPaid >= parseFloat(order.total_usd)) {
            await update('orders', { order_id }, { status: 'Paid', updated_at: new Date().toISOString() });
        }

        return JSON.stringify({ success: true, payment });
    },
});

export const listPayments = tool({
    name: 'list_payments',
    description: 'List payments recorded for an order or all payments.',
    parameters: z.object({
        order_id: z.number().optional().describe('Filter by order ID'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ order_id, limit }) => {
        const filters = order_id ? { order_id } : {};
        const data = await query('payments', {
            filters,
            order: { column: 'created_at', ascending: false },
            limit: limit || 20,
        });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────────────────────────────────────

export const createRefund = tool({
    name: 'create_refund',
    description: 'Create a refund request for an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
        payment_id: z.number().optional().describe('Specific payment to refund'),
        amount_usd: z.number().describe('Refund amount'),
        reason: z.string().optional().describe('Reason for refund'),
    }),
    execute: async ({ order_id, payment_id, amount_usd, reason }) => {
        const refund = await insert('refunds', {
            order_id,
            payment_id,
            amount_usd,
            reason,
            status: 'Pending',
        });
        return JSON.stringify({ success: true, refund });
    },
});

export const updateRefundStatus = tool({
    name: 'update_refund_status',
    description: 'Update the status of a refund.',
    parameters: z.object({
        refund_id: z.number().describe('Refund ID'),
        status: z.enum(['Pending', 'Approved', 'Rejected', 'Completed']).describe('New status'),
    }),
    execute: async ({ refund_id, status }) => {
        const updated = await update('refunds', { refund_id }, { status });

        // If completed, update order status
        if (status === 'Completed') {
            const refund = (await query('refunds', { filters: { refund_id } }))[0];
            const order = (await query('orders', { filters: { order_id: refund.order_id } }))[0];

            const allRefunds = await query('refunds', { filters: { order_id: refund.order_id } });
            const totalRefunded = allRefunds.reduce((sum, r) => r.status === 'Completed' ? sum + parseFloat(r.amount_usd) : sum, 0);

            if (totalRefunded >= parseFloat(order.total_usd)) {
                await update('orders', { order_id: refund.order_id }, { status: 'Refunded' });
            } else if (totalRefunded > 0) {
                await update('orders', { order_id: refund.order_id }, { status: 'PartiallyRefunded' });
            }
        }

        return JSON.stringify({ success: true, refund: updated[0] });
    },
});

export const listRefunds = tool({
    name: 'list_refunds',
    description: 'List refunds, optionally filtered.',
    parameters: z.object({
        order_id: z.number().optional().describe('Filter by order ID'),
        status: z.string().optional().describe('Filter by status'),
        limit: z.number().optional().describe('Max results'),
    }),
    execute: async ({ order_id, status, limit }) => {
        const filters = {};
        if (order_id) filters.order_id = order_id;
        if (status) filters.status = status;

        const data = await query('refunds', {
            filters,
            order: { column: 'created_at', ascending: false },
            limit: limit || 20,
        });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Promotions
// ─────────────────────────────────────────────────────────────────────────────

export const listPromotions = tool({
    name: 'list_promotions',
    description: 'List current promotions and discount codes.',
    parameters: z.object({
        only_active: z.boolean().optional().describe('If true, only active promos'),
    }),
    execute: async ({ only_active }) => {
        const filters = only_active !== false ? { is_active: true } : {};
        const data = await query('promotions', { filters });
        return JSON.stringify(data);
    },
});

export const applyPromotion = tool({
    name: 'apply_promotion',
    description: 'Apply a promotion code to an order.',
    parameters: z.object({
        order_id: z.number().describe('Order ID'),
        promotion_code: z.string().describe('Promotion code'),
    }),
    execute: async ({ order_id, promotion_code }) => {
        // Find the promotion
        const promos = await query('promotions', { filters: { code: promotion_code, is_active: true } });
        if (!promos.length) return JSON.stringify({ error: 'Invalid or expired promotion code' });

        const promo = promos[0];

        // Check redemption limit
        if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
            return JSON.stringify({ error: 'Promotion has reached maximum redemptions' });
        }

        // Link promotion to order
        await insert('order_promotions', {
            order_id,
            promotion_id: promo.promotion_id,
        });

        // Increment redemption count
        await update('promotions', { promotion_id: promo.promotion_id }, {
            redemptions: promo.redemptions + 1,
        });

        // Recalculate order totals
        await recalculateOrderTotals(order_id);

        return JSON.stringify({ success: true, promotion: promo });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Recalculate Order Totals
// ─────────────────────────────────────────────────────────────────────────────

async function recalculateOrderTotals(order_id) {
    const items = await query('order_items', { filters: { order_id } });
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.line_total_usd), 0);

    // Get applied promotions
    const orderPromos = await query('order_promotions', { filters: { order_id } });
    let discount = 0;

    for (const op of orderPromos) {
        const promos = await query('promotions', { filters: { promotion_id: op.promotion_id } });
        if (promos.length) {
            const promo = promos[0];
            if (promo.percent_off) {
                discount += subtotal * (parseFloat(promo.percent_off) / 100);
            }
            if (promo.amount_off_usd) {
                discount += parseFloat(promo.amount_off_usd);
            }
        }
    }

    const taxRate = 0.10; // 10% tax
    const afterDiscount = Math.max(0, subtotal - discount);
    const tax = afterDiscount * taxRate;
    const total = afterDiscount + tax;

    await update('orders', { order_id }, {
        subtotal_usd: subtotal.toFixed(2),
        discount_usd: discount.toFixed(2),
        tax_usd: tax.toFixed(2),
        total_usd: total.toFixed(2),
        updated_at: new Date().toISOString(),
    });
}

// Export all order tools
export const orderTools = [
    createOrder,
    getOrderDetails,
    searchOrders,
    updateOrderStatus,
    addOrderItem,
    listOrderItems,
    recordPayment,
    listPayments,
    createRefund,
    updateRefundStatus,
    listRefunds,
    listPromotions,
    applyPromotion,
];
