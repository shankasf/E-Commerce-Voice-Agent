/**
 * Catalog Agent Tools - Products, inventory
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Search Products
// ─────────────────────────────────────────────────────────────────────────────

export const searchProducts = tool({
    name: 'search_products',
    description: 'Search the toy catalog by keyword, category, or age group.',
    parameters: z.object({
        keyword: z.string().optional().describe('Search term (name, brand, SKU)'),
        category: z.string().optional().describe('Category filter'),
        age_group: z.string().optional().describe('Age group filter'),
        max_results: z.number().optional().describe('Number of results (1-20)'),
    }),
    execute: async ({ keyword, category, age_group, max_results }) => {
        let data = await query('products', {
            filters: { is_active: true },
            limit: max_results || 10,
        });

        if (keyword) {
            const lower = keyword.toLowerCase();
            data = data.filter(p =>
                p.product_name?.toLowerCase().includes(lower) ||
                p.brand?.toLowerCase().includes(lower) ||
                p.sku?.toLowerCase().includes(lower) ||
                p.description?.toLowerCase().includes(lower)
            );
        }
        if (category) {
            data = data.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        }
        if (age_group) {
            data = data.filter(p => p.age_group?.toLowerCase().includes(age_group.toLowerCase()));
        }

        return JSON.stringify(data.slice(0, max_results || 10));
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Product Details
// ─────────────────────────────────────────────────────────────────────────────

export const getProductDetails = tool({
    name: 'get_product_details',
    description: 'Get detailed information about a specific toy product.',
    parameters: z.object({
        product_id: z.number().describe('Product ID to look up'),
    }),
    execute: async ({ product_id }) => {
        const data = await query('products', { filters: { product_id } });
        if (!data.length) return JSON.stringify({ error: 'Product not found' });
        return JSON.stringify(data[0]);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Check Inventory
// ─────────────────────────────────────────────────────────────────────────────

export const checkInventory = tool({
    name: 'check_inventory',
    description: 'Check current stock quantity for a product.',
    parameters: z.object({
        product_id: z.number().describe('Product ID'),
    }),
    execute: async ({ product_id }) => {
        const data = await query('products', {
            select: 'product_id, product_name, stock_qty',
            filters: { product_id },
        });
        if (!data.length) return JSON.stringify({ error: 'Product not found' });
        return JSON.stringify(data[0]);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Inventory Movements
// ─────────────────────────────────────────────────────────────────────────────

export const getInventoryMovements = tool({
    name: 'get_inventory_movements',
    description: 'Get inventory movement history for a product.',
    parameters: z.object({
        product_id: z.number().describe('Product ID'),
        limit: z.number().optional().describe('Max records (default 10)'),
    }),
    execute: async ({ product_id, limit }) => {
        const data = await query('inventory_movements', {
            filters: { product_id },
            order: { column: 'created_at', ascending: false },
            limit: limit || 10,
        });
        return JSON.stringify(data);
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Record Inventory Movement
// ─────────────────────────────────────────────────────────────────────────────

export const recordInventoryMovement = tool({
    name: 'record_inventory_movement',
    description: 'Record an inventory adjustment (positive = add stock, negative = remove).',
    parameters: z.object({
        product_id: z.number().describe('Product ID'),
        quantity_change: z.number().describe('Quantity change (+/-)'),
        reason: z.string().optional().describe('Reason for adjustment'),
        ref_order_id: z.number().optional().describe('Related order ID if applicable'),
    }),
    execute: async ({ product_id, quantity_change, reason, ref_order_id }) => {
        const movement = await insert('inventory_movements', {
            product_id,
            quantity_change,
            reason,
            ref_order_id,
        });
        return JSON.stringify({ success: true, movement });
    },
});

// Export all catalog tools
export const catalogTools = [
    searchProducts,
    getProductDetails,
    checkInventory,
    getInventoryMovements,
    recordInventoryMovement,
];
