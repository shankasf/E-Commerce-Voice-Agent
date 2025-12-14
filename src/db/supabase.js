/**
 * Supabase client wrapper for all database operations.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generic query helper with error handling.
 */
export async function query(table, options = {}) {
    let q = supabase.from(table).select(options.select || '*');

    if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
            q = q.eq(key, value);
        }
    }
    if (options.ilike) {
        for (const [key, value] of Object.entries(options.ilike)) {
            q = q.ilike(key, `%${value}%`);
        }
    }
    if (options.order) {
        q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options.limit) {
        q = q.limit(options.limit);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Supabase error on ${table}: ${error.message}`);
    return data;
}

/**
 * Insert a record and return the inserted row.
 */
export async function insert(table, record) {
    const { data, error } = await supabase.from(table).insert(record).select().single();
    if (error) throw new Error(`Insert error on ${table}: ${error.message}`);
    return data;
}

/**
 * Update records matching filters.
 */
export async function update(table, filters, updates) {
    let q = supabase.from(table).update(updates);
    for (const [key, value] of Object.entries(filters)) {
        q = q.eq(key, value);
    }
    const { data, error } = await q.select();
    if (error) throw new Error(`Update error on ${table}: ${error.message}`);
    return data;
}

/**
 * Delete records matching filters.
 */
export async function remove(table, filters) {
    let q = supabase.from(table).delete();
    for (const [key, value] of Object.entries(filters)) {
        q = q.eq(key, value);
    }
    const { error } = await q;
    if (error) throw new Error(`Delete error on ${table}: ${error.message}`);
    return true;
}

export default { supabase, query, insert, update, remove };
