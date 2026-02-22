import { Router } from 'express';
import type { Response } from 'express';
import { getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { isSafeIdentifier } from '../utils/validators.js';
import type {
  AuthenticatedRequest,
  ApiResponse,
  SchemaObject,
  FunctionInfo,
  TriggerInfo,
  ViewInfo,
  ExtensionInfo,
  EnumInfo,
  ForeignKeyInfo
} from '../types/index.js';

// PostgreSQL 18.1 Schema Introspection Routes
// Reference: https://www.postgresql.org/docs/current/catalogs.html
// PostgreSQL 18.1 catalog changes:
// - pg_constraint.conenforced: New column for constraint enforcement flag
// - pg_class.relallfrozen: New column to track frozen status
// - Virtual generated columns now default (use STORED for stored columns)

const router = Router();

// GET /api/schema/:dbName/tables - Get all tables with columns (using pg_class, pg_attribute)
router.get(
  '/:dbName/tables',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    // Using PostgreSQL 18.1 system catalogs per https://www.postgresql.org/docs/current/catalogs.html
    const result = await dbPool.query<SchemaObject>(
      `SELECT
          n.nspname AS schema_name,
          c.relname AS table_name,
          a.attname AS column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
          a.attnotnull AS not_null,
          pg_get_expr(d.adbin, d.adrelid) AS default_value
       FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
       LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       WHERE c.relkind = 'r'
         AND a.attnum > 0
         AND NOT a.attisdropped
         AND n.nspname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY n.nspname, c.relname, a.attnum;`
    );

    // Group by table
    const tables = new Map<string, { schema: string; table: string; columns: SchemaObject[] }>();
    for (const row of result.rows) {
      const key = `${row.schema_name}.${row.table_name}`;
      if (!tables.has(key)) {
        tables.set(key, {
          schema: row.schema_name!,
          table: row.table_name!,
          columns: []
        });
      }
      tables.get(key)!.columns.push(row);
    }

    const response: ApiResponse = {
      success: true,
      data: Array.from(tables.values())
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/foreign-keys - Get all foreign keys (using pg_constraint)
router.get(
  '/:dbName/foreign-keys',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    // Using pg_constraint per PostgreSQL docs
    const result = await dbPool.query<ForeignKeyInfo>(
      `SELECT
          tc.conname AS constraint_name,
          n.nspname AS schema_name,
          c.relname AS table_name,
          a.attname AS column_name,
          fn.nspname AS foreign_schema,
          fc.relname AS foreign_table,
          fa.attname AS foreign_column
       FROM pg_catalog.pg_constraint tc
       JOIN pg_catalog.pg_class c ON tc.conrelid = c.oid
       JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
       JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(tc.conkey)
       JOIN pg_catalog.pg_class fc ON tc.confrelid = fc.oid
       JOIN pg_catalog.pg_namespace fn ON fc.relnamespace = fn.oid
       JOIN pg_catalog.pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = ANY(tc.confkey)
       WHERE tc.contype = 'f'
         AND n.nspname NOT IN ('pg_catalog', 'information_schema');`
    );

    const response: ApiResponse<ForeignKeyInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/functions - Get all functions (using pg_proc)
router.get(
  '/:dbName/functions',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    // Using pg_proc per PostgreSQL docs
    const result = await dbPool.query<FunctionInfo>(
      `SELECT
          n.nspname AS schema_name,
          p.proname AS function_name,
          pg_get_functiondef(p.oid) AS definition,
          pg_get_function_arguments(p.oid) AS arguments,
          pg_get_function_result(p.oid) AS return_type
       FROM pg_catalog.pg_proc p
       JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
         AND p.prokind = 'f'
       ORDER BY n.nspname, p.proname;`
    );

    const response: ApiResponse<FunctionInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/triggers - Get all triggers (using pg_trigger)
router.get(
  '/:dbName/triggers',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    // Using pg_trigger per PostgreSQL docs
    const result = await dbPool.query<TriggerInfo>(
      `SELECT
          t.tgname AS trigger_name,
          n.nspname AS schema_name,
          c.relname AS table_name,
          pg_get_triggerdef(t.oid) AS definition
       FROM pg_catalog.pg_trigger t
       JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
       JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
       WHERE NOT t.tgisinternal
         AND n.nspname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY n.nspname, c.relname, t.tgname;`
    );

    const response: ApiResponse<TriggerInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/views - Get all views
router.get(
  '/:dbName/views',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    const result = await dbPool.query<ViewInfo>(
      `SELECT
          n.nspname AS schema_name,
          c.relname AS view_name,
          pg_get_viewdef(c.oid) AS definition
       FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
       WHERE c.relkind = 'v'
         AND n.nspname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY n.nspname, c.relname;`
    );

    const response: ApiResponse<ViewInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/extensions - Get all extensions (using pg_extension)
router.get(
  '/:dbName/extensions',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    const result = await dbPool.query<ExtensionInfo>(
      `SELECT extname, extversion FROM pg_catalog.pg_extension ORDER BY extname;`
    );

    const response: ApiResponse<ExtensionInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/types - Get custom types/enums (using pg_type, pg_enum)
router.get(
  '/:dbName/types',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    const result = await dbPool.query<EnumInfo>(
      `SELECT
          n.nspname AS schema_name,
          t.typname AS type_name,
          ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
       FROM pg_catalog.pg_type t
       JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
       LEFT JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid
       WHERE t.typtype = 'e'
         AND n.nspname NOT IN ('pg_catalog', 'information_schema')
       GROUP BY n.nspname, t.typname
       ORDER BY n.nspname, t.typname;`
    );

    const response: ApiResponse<EnumInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// GET /api/schema/:dbName/full - Get complete schema (tables, views, functions, triggers, types)
router.get(
  '/:dbName/full',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);

    // Fetch all schema objects in parallel
    const [tablesResult, viewsResult, functionsResult, triggersResult, typesResult, extensionsResult, fksResult] = await Promise.all([
      // Tables
      dbPool.query(`
        SELECT n.nspname AS schema_name, c.relname AS table_name
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname, c.relname;
      `),
      // Views
      dbPool.query(`
        SELECT n.nspname AS schema_name, c.relname AS view_name
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relkind = 'v' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname, c.relname;
      `),
      // Functions count
      dbPool.query(`
        SELECT COUNT(*) as count
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND p.prokind = 'f';
      `),
      // Triggers count
      dbPool.query(`
        SELECT COUNT(*) as count
        FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE NOT t.tgisinternal AND n.nspname NOT IN ('pg_catalog', 'information_schema');
      `),
      // Types count
      dbPool.query(`
        SELECT COUNT(*) as count
        FROM pg_catalog.pg_type t
        JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typtype = 'e' AND n.nspname NOT IN ('pg_catalog', 'information_schema');
      `),
      // Extensions
      dbPool.query(`SELECT extname, extversion FROM pg_catalog.pg_extension ORDER BY extname;`),
      // Foreign keys count
      dbPool.query(`
        SELECT COUNT(*) as count
        FROM pg_catalog.pg_constraint tc
        WHERE tc.contype = 'f';
      `)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        tables: tablesResult.rows,
        views: viewsResult.rows,
        functionsCount: parseInt(functionsResult.rows[0].count, 10),
        triggersCount: parseInt(triggersResult.rows[0].count, 10),
        typesCount: parseInt(typesResult.rows[0].count, 10),
        extensions: extensionsResult.rows,
        foreignKeysCount: parseInt(fksResult.rows[0].count, 10)
      }
    };
    res.json(response);
  })
);

export default router;
