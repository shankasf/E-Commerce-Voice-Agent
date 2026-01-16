import { Router } from 'express';
import { getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { isSafeIdentifier, quoteIdent } from '../utils/validators.js';
const router = Router();
function parseFilters(query) {
    const filters = [];
    const reservedParams = ['select', 'order', 'limit', 'offset', 'page', 'per_page'];
    for (const [key, value] of Object.entries(query)) {
        if (reservedParams.includes(key) || typeof value !== 'string')
            continue;
        // Parse operator from value (e.g., "eq.value", "gt.10")
        const match = value.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|is|in|fts)\.(.+)$/);
        if (match) {
            filters.push({
                column: key,
                operator: match[1],
                value: match[2],
            });
        }
    }
    return filters;
}
function buildWhereClause(filters) {
    if (filters.length === 0) {
        return { sql: '', params: [] };
    }
    const conditions = [];
    const params = [];
    for (const filter of filters) {
        if (!isSafeIdentifier(filter.column))
            continue;
        const paramIndex = params.length + 1;
        const column = quoteIdent(filter.column);
        switch (filter.operator) {
            case 'eq':
                conditions.push(`${column} = $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'neq':
                conditions.push(`${column} != $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'gt':
                conditions.push(`${column} > $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'gte':
                conditions.push(`${column} >= $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'lt':
                conditions.push(`${column} < $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'lte':
                conditions.push(`${column} <= $${paramIndex}`);
                params.push(filter.value);
                break;
            case 'like':
                conditions.push(`${column} LIKE $${paramIndex}`);
                params.push(filter.value.replace(/\*/g, '%'));
                break;
            case 'ilike':
                conditions.push(`${column} ILIKE $${paramIndex}`);
                params.push(filter.value.replace(/\*/g, '%'));
                break;
            case 'is':
                if (filter.value === 'null') {
                    conditions.push(`${column} IS NULL`);
                }
                else if (filter.value === 'true') {
                    conditions.push(`${column} IS TRUE`);
                }
                else if (filter.value === 'false') {
                    conditions.push(`${column} IS FALSE`);
                }
                break;
            case 'in': {
                const values = filter.value.split(',');
                const placeholders = values.map((_, i) => `$${paramIndex + i}`);
                conditions.push(`${column} IN (${placeholders.join(', ')})`);
                params.push(...values);
                break;
            }
            case 'fts':
                conditions.push(`to_tsvector(${column}) @@ plainto_tsquery($${paramIndex})`);
                params.push(filter.value);
                break;
        }
    }
    return {
        sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
}
function parseOrder(orderParam) {
    if (!orderParam)
        return '';
    const orders = orderParam.split(',').map((o) => {
        const [col, dir] = o.split('.');
        if (!isSafeIdentifier(col))
            return null;
        const direction = dir?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        return `${quoteIdent(col)} ${direction}`;
    }).filter(Boolean);
    return orders.length > 0 ? `ORDER BY ${orders.join(', ')}` : '';
}
function parseSelect(selectParam, allColumns) {
    if (!selectParam || selectParam === '*') {
        return '*';
    }
    const cols = selectParam.split(',')
        .map((c) => c.trim())
        .filter((c) => isSafeIdentifier(c) && allColumns.includes(c))
        .map((c) => quoteIdent(c));
    return cols.length > 0 ? cols.join(', ') : '*';
}
// GET /api/rest/:dbName/:schema/:table - List rows with filtering
router.get('/:dbName/:schema/:table', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const query = req.query;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    // Get column names for validation
    const columnsResult = await dbPool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`, [schema, table]);
    const allColumns = columnsResult.rows.map((r) => r.column_name);
    // Parse query parameters
    const filters = parseFilters(query);
    const { sql: whereClause, params } = buildWhereClause(filters);
    const orderClause = parseOrder(query.order);
    const selectClause = parseSelect(query.select, allColumns);
    const limit = Math.min(Number.parseInt(query.limit || '100', 10), 1000);
    const offset = Number.parseInt(query.offset || '0', 10);
    // Count total
    const countSql = `SELECT COUNT(*) as total FROM ${quoteIdent(schema)}.${quoteIdent(table)} ${whereClause}`;
    const countResult = await dbPool.query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);
    // Get rows
    const sql = `
      SELECT ${selectClause}
      FROM ${quoteIdent(schema)}.${quoteIdent(table)}
      ${whereClause}
      ${orderClause}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const result = await dbPool.query(sql, [...params, limit, offset]);
    const response = {
        success: true,
        data: result.rows,
        meta: { total, limit, offset },
    };
    res.json(response);
}));
// GET /api/rest/:dbName/:schema/:table/:id - Get single row
router.get('/:dbName/:schema/:table/:id', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, id } = req.params;
    const primaryKey = req.query.pk || 'id';
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    if (!isSafeIdentifier(primaryKey)) {
        throw new ValidationError('Invalid primary key column');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = $1`, [id]);
    if (result.rows.length === 0) {
        throw new ValidationError('Row not found');
    }
    const response = {
        success: true,
        data: result.rows[0],
    };
    res.json(response);
}));
// POST /api/rest/:dbName/:schema/:table - Insert row
router.post('/:dbName/:schema/:table', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const rowData = req.body;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    const columns = [];
    const values = [];
    const placeholders = [];
    for (const [key, value] of Object.entries(rowData)) {
        if (isSafeIdentifier(key) && value !== undefined) {
            columns.push(quoteIdent(key));
            values.push(value);
            placeholders.push(`$${values.length}`);
        }
    }
    if (columns.length === 0) {
        throw new ValidationError('No data provided');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`INSERT INTO ${quoteIdent(schema)}.${quoteIdent(table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values);
    const response = {
        success: true,
        data: result.rows[0],
    };
    res.status(201).json(response);
}));
// PATCH /api/rest/:dbName/:schema/:table/:id - Update row
router.patch('/:dbName/:schema/:table/:id', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, id } = req.params;
    const primaryKey = req.query.pk || 'id';
    const rowData = req.body;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    if (!isSafeIdentifier(primaryKey)) {
        throw new ValidationError('Invalid primary key column');
    }
    const setClauses = [];
    const values = [];
    for (const [key, value] of Object.entries(rowData)) {
        if (isSafeIdentifier(key) && value !== undefined) {
            values.push(value);
            setClauses.push(`${quoteIdent(key)} = $${values.length}`);
        }
    }
    if (setClauses.length === 0) {
        throw new ValidationError('No data to update');
    }
    values.push(id);
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`UPDATE ${quoteIdent(schema)}.${quoteIdent(table)} SET ${setClauses.join(', ')} WHERE ${quoteIdent(primaryKey)} = $${values.length} RETURNING *`, values);
    if (result.rows.length === 0) {
        throw new ValidationError('Row not found');
    }
    const response = {
        success: true,
        data: result.rows[0],
    };
    res.json(response);
}));
// DELETE /api/rest/:dbName/:schema/:table/:id - Delete row
router.delete('/:dbName/:schema/:table/:id', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, id } = req.params;
    const primaryKey = req.query.pk || 'id';
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    if (!isSafeIdentifier(primaryKey)) {
        throw new ValidationError('Invalid primary key column');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`DELETE FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
        throw new ValidationError('Row not found');
    }
    const response = {
        success: true,
        data: result.rows[0],
    };
    res.json(response);
}));
export default router;
//# sourceMappingURL=rest.routes.js.map