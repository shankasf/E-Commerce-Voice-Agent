import { Router } from 'express';
import { getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier, quoteIdent } from '../utils/validators.js';
const router = Router();
// GET /api/databases/:dbName/tables/:schema/:table - Get table details
router.get('/:dbName/tables/:schema/:table', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const limit = Math.min(Number.parseInt(req.query.limit || '50', 10), 500);
    const offset = Math.max(Number.parseInt(req.query.offset || '0', 10), 0);
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    // Get columns with details
    const columnsResult = await dbPool.query(`SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
              c.character_maximum_length,
              CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
       FROM information_schema.columns c
       LEFT JOIN (
         SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
       ) pk ON c.column_name = pk.column_name
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position;`, [schema, table]);
    // Get row count
    const countResult = await dbPool.query(`SELECT COUNT(*) as count FROM ${quoteIdent(schema)}.${quoteIdent(table)};`);
    const totalRows = parseInt(countResult.rows[0].count, 10);
    // Get rows
    const rowsResult = await dbPool.query(`SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT $1 OFFSET $2;`, [limit, offset]);
    // Get indexes
    const indexesResult = await dbPool.query(`SELECT indexname, indexdef,
              CASE WHEN indexdef LIKE '%UNIQUE%' THEN true ELSE false END as is_unique,
              CASE WHEN indexdef LIKE '%btree%' THEN 'btree'
                   WHEN indexdef LIKE '%hash%' THEN 'hash'
                   WHEN indexdef LIKE '%gin%' THEN 'gin'
                   WHEN indexdef LIKE '%gist%' THEN 'gist'
                   ELSE 'other' END as index_type,
              regexp_replace(indexdef, '.*\\((.*)\\)', '\\1') as columns
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2;`, [schema, table]);
    // Get constraints
    const constraintsResult = await dbPool.query(`SELECT tc.constraint_name, tc.constraint_type,
              pg_get_constraintdef(pgc.oid) as definition
       FROM information_schema.table_constraints tc
       LEFT JOIN pg_constraint pgc ON tc.constraint_name = pgc.conname
       WHERE tc.table_schema = $1 AND tc.table_name = $2;`, [schema, table]);
    const response = {
        success: true,
        data: {
            schema,
            table,
            columns: columnsResult.rows,
            indexes: indexesResult.rows,
            constraints: constraintsResult.rows,
            rows: rowsResult.rows
        },
        meta: {
            total: totalRows,
            limit,
            offset
        }
    };
    res.json(response);
}));
// GET /api/databases/:dbName/tables/:schema/:table/export/csv - Export table as CSV
router.get('/:dbName/tables/:schema/:table/export/csv', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid table reference');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)};`);
    if (result.rows.length === 0) {
        throw new ValidationError('No data to export');
    }
    const columns = Object.keys(result.rows[0]);
    let csv = columns.join(',') + '\n';
    for (const row of result.rows) {
        const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined)
                return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        });
        csv += values.join(',') + '\n';
    }
    const filename = `${schema}_${table}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
}));
// POST /api/databases/:dbName/tables - Create table
router.post('/:dbName/tables', requireAuth, asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    const { schema, name, columns, addCreatedAt, addUpdatedAt } = req.body;
    if (!isSafeIdentifier(dbName) || !isSafeIdentifier(schema) || !isSafeIdentifier(name)) {
        throw new ValidationError('Invalid names provided');
    }
    const columnDefs = [];
    const primaryKeys = [];
    if (Array.isArray(columns)) {
        for (const col of columns) {
            if (!col.name || !isSafeIdentifier(col.name))
                continue;
            let def = `${quoteIdent(col.name)} ${col.type || 'TEXT'}`;
            if (col.notNull)
                def += ' NOT NULL';
            // Support both 'default' and 'defaultValue' property names
            const defaultVal = col.default || col.defaultValue;
            if (defaultVal)
                def += ` DEFAULT ${defaultVal}`;
            if (col.unique && !col.primaryKey)
                def += ' UNIQUE';
            columnDefs.push(def);
            if (col.primaryKey)
                primaryKeys.push(quoteIdent(col.name));
        }
    }
    if (addCreatedAt) {
        columnDefs.push('created_at TIMESTAMPTZ DEFAULT NOW()');
    }
    if (addUpdatedAt) {
        columnDefs.push('updated_at TIMESTAMPTZ DEFAULT NOW()');
    }
    if (primaryKeys.length > 0) {
        columnDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const sql = `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(name)} (${columnDefs.join(', ')});`;
    await dbPool.query(sql);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'create_table',
        target: `${dbName}.${schema}.${name}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { schema, name }
    };
    res.status(201).json(response);
}));
// DELETE /api/databases/:dbName/tables/:schema/:table - Drop table
router.delete('/:dbName/tables/:schema/:table', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`DROP TABLE ${quoteIdent(schema)}.${quoteIdent(table)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'drop_table',
        target: `${dbName}.${schema}.${table}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Table '${schema}.${table}' dropped` }
    };
    res.json(response);
}));
// POST /api/databases/:dbName/tables/:schema/:table/truncate - Truncate table
router.post('/:dbName/tables/:schema/:table/truncate', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`TRUNCATE TABLE ${quoteIdent(schema)}.${quoteIdent(table)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'truncate_table',
        target: `${dbName}.${schema}.${table}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Table '${schema}.${table}' truncated` }
    };
    res.json(response);
}));
// POST /api/databases/:dbName/tables/:schema/:table/columns - Add column
router.post('/:dbName/tables/:schema/:table/columns', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { name, type, notNull, defaultValue } = req.body;
    if (![dbName, schema, table, name].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    let sql = `ALTER TABLE ${quoteIdent(schema)}.${quoteIdent(table)} ADD COLUMN ${quoteIdent(name)} ${type}`;
    if (notNull)
        sql += ' NOT NULL';
    if (defaultValue)
        sql += ` DEFAULT ${defaultValue}`;
    await dbPool.query(sql);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'add_column',
        target: `${dbName}.${schema}.${table}.${name}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { column: name }
    };
    res.status(201).json(response);
}));
// DELETE /api/databases/:dbName/tables/:schema/:table/columns/:column - Drop column
router.delete('/:dbName/tables/:schema/:table/columns/:column', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, column } = req.params;
    if (![dbName, schema, table, column].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`ALTER TABLE ${quoteIdent(schema)}.${quoteIdent(table)} DROP COLUMN ${quoteIdent(column)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'drop_column',
        target: `${dbName}.${schema}.${table}.${column}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Column '${column}' dropped` }
    };
    res.json(response);
}));
// POST /api/databases/:dbName/tables/:schema/:table/rows - Insert row
router.post('/:dbName/tables/:schema/:table/rows', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const rowData = req.body;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const columns = [];
    const values = [];
    const placeholders = [];
    let i = 1;
    for (const [key, value] of Object.entries(rowData)) {
        if (isSafeIdentifier(key) && value !== '' && value !== undefined) {
            columns.push(quoteIdent(key));
            values.push(value);
            placeholders.push(`$${i++}`);
        }
    }
    if (columns.length === 0) {
        throw new ValidationError('No data provided');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`INSERT INTO ${quoteIdent(schema)}.${quoteIdent(table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *;`, values);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'insert_row',
        target: `${dbName}.${schema}.${table}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: result.rows[0]
    };
    res.status(201).json(response);
}));
// PATCH /api/databases/:dbName/tables/:schema/:table/rows/:id - Update row
router.patch('/:dbName/tables/:schema/:table/rows/:id', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, id } = req.params;
    const { primaryKey = 'id', ...rowData } = req.body;
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    if (!isSafeIdentifier(primaryKey)) {
        throw new ValidationError('Invalid primary key column name');
    }
    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(rowData)) {
        if (isSafeIdentifier(key)) {
            setClauses.push(`${quoteIdent(key)} = $${i++}`);
            values.push(value);
        }
    }
    if (setClauses.length === 0) {
        throw new ValidationError('No data to update');
    }
    values.push(id);
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`UPDATE ${quoteIdent(schema)}.${quoteIdent(table)} SET ${setClauses.join(', ')} WHERE ${quoteIdent(primaryKey)} = $${values.length} RETURNING *;`, values);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'update_row',
        target: `${dbName}.${schema}.${table}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: result.rows[0]
    };
    res.json(response);
}));
// DELETE /api/databases/:dbName/tables/:schema/:table/rows/:id - Delete row
router.delete('/:dbName/tables/:schema/:table/rows/:id', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table, id } = req.params;
    const primaryKey = req.query.primaryKey || 'id';
    if (![dbName, schema, table].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    if (!isSafeIdentifier(primaryKey)) {
        throw new ValidationError('Invalid primary key column name');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(`DELETE FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = $1 RETURNING *;`, [id]);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'delete_row',
        target: `${dbName}.${schema}.${table}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: result.rows[0]
    };
    res.json(response);
}));
// POST /api/databases/:dbName/tables/:schema/:table/indexes - Create index
router.post('/:dbName/tables/:schema/:table/indexes', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { name, columns, unique } = req.body;
    if (![dbName, schema, table, name].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const columnList = columns.split(',').map((c) => c.trim()).filter(isSafeIdentifier);
    if (columnList.length === 0) {
        throw new ValidationError('Invalid column names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    const uniqueClause = unique ? 'UNIQUE ' : '';
    await dbPool.query(`CREATE ${uniqueClause}INDEX ${quoteIdent(name)} ON ${quoteIdent(schema)}.${quoteIdent(table)} (${columnList.map(quoteIdent).join(', ')});`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'create_index',
        target: `${dbName}.${schema}.${table}.${name}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { index: name }
    };
    res.status(201).json(response);
}));
// DELETE /api/databases/:dbName/tables/:schema/:table/indexes/:index - Drop index
router.delete('/:dbName/tables/:schema/:table/indexes/:index', requireAuth, asyncHandler(async (req, res) => {
    const { dbName, schema, index } = req.params;
    if (![dbName, schema, index].every(isSafeIdentifier)) {
        throw new ValidationError('Invalid names');
    }
    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`DROP INDEX ${quoteIdent(schema)}.${quoteIdent(index)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'drop_index',
        target: `${dbName}.${schema}.${index}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Index '${index}' dropped` }
    };
    res.json(response);
}));
export default router;
//# sourceMappingURL=table.routes.js.map