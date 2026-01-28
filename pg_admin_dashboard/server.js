import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import bcrypt from 'bcryptjs';
import FileStoreFactory from 'session-file-store';
import { config } from './src/config.js';
import { createAdminPool, getPoolForDb, closePools } from './src/db.js';
import { ensureDir, logAudit } from './src/audit.js';
import { isSafeIdentifier, quoteIdent } from './src/validators.js';
import { requireAuth, attachFlash, setFlash } from './src/middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

const adminPasswordHash = config.adminPasswordHash
  ? config.adminPasswordHash
  : bcrypt.hashSync(config.adminPassword, 12);

await fs.mkdir(config.sessionDir, { recursive: true });
await ensureDir(config.auditLogPath);

const FileStore = FileStoreFactory(session);
const sessionStore = new FileStore({
  path: config.sessionDir,
  retries: 1,
  ttl: 60 * 60 * 6
});

const adminPool = createAdminPool(config.pg);

app.locals.formatBytes = (value) => {
  if (value === null || value === undefined) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const csp = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"]
  }
};

app.use(helmet({ contentSecurityPolicy: csp }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  session({
    store: sessionStore,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.trustProxy
    }
  })
);

app.use(attachFlash);
app.use(csrf());

app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.allowDbDrop = config.allowDbDrop;
  res.locals.allowSuperuserGrant = config.allowSuperuserGrant;
  res.locals.csrfToken = req.csrfToken();
  res.locals.currentPath = req.path;
  next();
});

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

app.get('/login', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/');
  }
  return res.render('login', { title: 'Sign in' });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      setFlash(req, 'error', 'Enter both username and password.');
      return res.redirect('/login');
    }

    const isValidUser = username === config.adminId;
    const isValidPass = await bcrypt.compare(password, adminPasswordHash);

    if (!isValidUser || !isValidPass) {
      setFlash(req, 'error', 'Invalid credentials.');
      return res.redirect('/login');
    }

    req.session.user = { id: username, loggedInAt: Date.now() };
    setFlash(req, 'success', 'Welcome back.');
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        setFlash(req, 'error', 'Login failed. Please try again.');
        return res.redirect('/login');
      }
      return res.redirect('/');
    });
  })
);

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.use(requireAuth);

app.get(
  '/',
  asyncHandler(async (req, res) => {
    const dbResult = await adminPool.query(
      `SELECT datname,
              pg_database_size(datname) AS size_bytes,
              pg_get_userbyid(datdba) AS owner,
              datallowconn
       FROM pg_database
       WHERE datistemplate = false
       ORDER BY datname;`
    );

    const rolesResult = await adminPool.query(
      `SELECT rolname
       FROM pg_roles
       WHERE rolname !~ '^pg_'
       ORDER BY rolname;`
    );

    res.render('dashboard', {
      title: 'Databases',
      databases: dbResult.rows,
      roles: rolesResult.rows
    });
  })
);

app.post(
  '/db/create',
  asyncHandler(async (req, res) => {
    const { dbName, owner } = req.body;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Database name must use letters, numbers, underscore, or hyphen.');
      return res.redirect('/');
    }

    if (owner && !isSafeIdentifier(owner)) {
      setFlash(req, 'error', 'Owner name must use letters, numbers, underscore, or hyphen.');
      return res.redirect('/');
    }

    const ownerClause = owner ? ` OWNER ${quoteIdent(owner)}` : '';
    await adminPool.query(`CREATE DATABASE ${quoteIdent(dbName)}${ownerClause};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'create_database',
      target: dbName,
      metadata: { owner: owner || null }
    });

    setFlash(req, 'success', `Database ${dbName} created.`);
    return res.redirect('/');
  })
);

app.post(
  '/db/drop',
  asyncHandler(async (req, res) => {
    if (!config.allowDbDrop) {
      setFlash(req, 'error', 'Dropping databases is disabled.');
      return res.redirect('/');
    }

    const { dbName, confirmName } = req.body;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/');
    }

    if (dbName !== confirmName) {
      setFlash(req, 'error', 'Confirmation name does not match.');
      return res.redirect('/');
    }

    await adminPool.query(`DROP DATABASE ${quoteIdent(dbName)};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'drop_database',
      target: dbName
    });

    setFlash(req, 'success', `Database ${dbName} dropped.`);
    return res.redirect('/');
  })
);

app.get(
  '/db/:dbName',
  asyncHandler(async (req, res) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const tablesResult = await dbPool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name;`
    );

    res.render('db', {
      title: `Database: ${dbName}`,
      dbName,
      tables: tablesResult.rows
    });
  })
);

app.get(
  '/db/:dbName/table/:schema/:table',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid table reference.');
      return res.redirect(`/db/${dbName}`);
    }

    const limit = Math.min(Number.parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(Number.parseInt(req.query.offset || '0', 10), 0);

    const dbPool = getPoolForDb(config.pg, dbName);
    const columnsResult = await dbPool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position;`,
      [schema, table]
    );

    const identifier = `${quoteIdent(schema)}.${quoteIdent(table)}`;
    const rowsResult = await dbPool.query(
      `SELECT * FROM ${identifier} LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );

    res.render('table', {
      title: `Table: ${schema}.${table}`,
      dbName,
      schema,
      table,
      columns: columnsResult.rows,
      rows: rowsResult.rows,
      limit,
      offset
    });
  })
);

app.get(
  '/users',
  asyncHandler(async (req, res) => {
    const rolesResult = await adminPool.query(
      `SELECT rolname,
              rolsuper,
              rolinherit,
              rolcreatedb,
              rolcreaterole,
              rolcanlogin
       FROM pg_roles
       WHERE rolname !~ '^pg_'
       ORDER BY rolname;`
    );

    const dbResult = await adminPool.query(
      `SELECT datname
       FROM pg_database
       WHERE datistemplate = false
       ORDER BY datname;`
    );

    res.render('users', {
      title: 'Users & Roles',
      roles: rolesResult.rows,
      databases: dbResult.rows
    });
  })
);

app.post(
  '/users/create',
  asyncHandler(async (req, res) => {
    const { username, password, canCreateDb, canCreateRole, isSuperuser } = req.body;

    if (!isSafeIdentifier(username)) {
      setFlash(req, 'error', 'Username must use letters, numbers, underscore, or hyphen.');
      return res.redirect('/users');
    }

    if (!password || password.length < 10) {
      setFlash(req, 'error', 'Password must be at least 10 characters.');
      return res.redirect('/users');
    }

    const flags = ['LOGIN'];
    if (canCreateDb) {
      flags.push('CREATEDB');
    }
    if (canCreateRole) {
      flags.push('CREATEROLE');
    }
    if (isSuperuser && config.allowSuperuserGrant) {
      flags.push('SUPERUSER');
    }

    const flagClause = flags.join(' ');
    await adminPool.query(
      `CREATE ROLE ${quoteIdent(username)} WITH ${flagClause} PASSWORD $1;`,
      [password]
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'create_user',
      target: username,
      metadata: {
        createdb: Boolean(canCreateDb),
        createrole: Boolean(canCreateRole),
        superuser: Boolean(isSuperuser && config.allowSuperuserGrant)
      }
    });

    setFlash(req, 'success', `User ${username} created.`);
    return res.redirect('/users');
  })
);

app.post(
  '/users/grant',
  asyncHandler(async (req, res) => {
    const { username, dbName } = req.body;

    if (!isSafeIdentifier(username) || !isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid user or database name.');
      return res.redirect('/users');
    }

    await adminPool.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(dbName)} TO ${quoteIdent(username)};`
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'grant_database',
      target: `${dbName}:${username}`
    });

    setFlash(req, 'success', `Granted ${username} access to ${dbName}.`);
    return res.redirect('/users');
  })
);

// Delete user/role
app.post(
  '/users/delete',
  asyncHandler(async (req, res) => {
    const { username } = req.body;

    if (!isSafeIdentifier(username)) {
      setFlash(req, 'error', 'Invalid username.');
      return res.redirect('/users');
    }

    await adminPool.query(`DROP ROLE ${quoteIdent(username)};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'delete_user',
      target: username
    });

    setFlash(req, 'success', `User ${username} deleted.`);
    return res.redirect('/users');
  })
);

// Change user password
app.post(
  '/users/password',
  asyncHandler(async (req, res) => {
    const { username, newPassword } = req.body;

    if (!isSafeIdentifier(username)) {
      setFlash(req, 'error', 'Invalid username.');
      return res.redirect('/users');
    }

    if (!newPassword || newPassword.length < 10) {
      setFlash(req, 'error', 'Password must be at least 10 characters.');
      return res.redirect('/users');
    }

    await adminPool.query(
      `ALTER ROLE ${quoteIdent(username)} WITH PASSWORD $1;`,
      [newPassword]
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'change_password',
      target: username
    });

    setFlash(req, 'success', `Password changed for ${username}.`);
    return res.redirect('/users');
  })
);

// Revoke database access
app.post(
  '/users/revoke',
  asyncHandler(async (req, res) => {
    const { username, dbName } = req.body;

    if (!isSafeIdentifier(username) || !isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid user or database name.');
      return res.redirect('/users');
    }

    await adminPool.query(
      `REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdent(dbName)} FROM ${quoteIdent(username)};`
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'revoke_database',
      target: `${dbName}:${username}`
    });

    setFlash(req, 'success', `Revoked ${username} access from ${dbName}.`);
    return res.redirect('/users');
  })
);

// ============================================
// SQL Query Editor Routes
// ============================================

app.get(
  '/db/:dbName/query',
  asyncHandler(async (req, res) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const tablesResult = await dbPool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name;`
    );

    res.render('query', {
      title: `Query: ${dbName}`,
      dbName,
      tables: tablesResult.rows,
      query: req.query.q || ''
    });
  })
);

app.post(
  '/db/:dbName/query/execute',
  asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    const { sql } = req.body;

    if (!isSafeIdentifier(dbName)) {
      return res.status(400).json({ error: 'Invalid database name.' });
    }

    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return res.status(400).json({ error: 'No SQL query provided.' });
    }

    // Security: limit query length
    if (sql.length > 50000) {
      return res.status(400).json({ error: 'Query too long (max 50000 characters).' });
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const start = Date.now();

    try {
      const result = await dbPool.query(sql);
      const duration = Date.now() - start;

      await logAudit(config.auditLogPath, {
        actor: req.session.user.id,
        action: 'execute_query',
        target: dbName,
        metadata: { query: sql.substring(0, 500), duration }
      });

      res.json({
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        command: result.command,
        duration
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

// ============================================
// Table Management Routes
// ============================================

// Create table page
app.get(
  '/db/:dbName/create-table',
  asyncHandler(async (req, res) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const schemasResult = await dbPool.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name;`
    );

    res.render('create-table', {
      title: `Create Table: ${dbName}`,
      dbName,
      schemas: schemasResult.rows
    });
  })
);

// Create table
app.post(
  '/db/:dbName/table/create',
  asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    const { schema, tableName, columns, addCreatedAt, addUpdatedAt } = req.body;

    if (!isSafeIdentifier(dbName) || !isSafeIdentifier(schema) || !isSafeIdentifier(tableName)) {
      setFlash(req, 'error', 'Invalid names provided.');
      return res.redirect(`/db/${dbName}/create-table`);
    }

    const columnDefs = [];
    const primaryKeys = [];

    if (Array.isArray(columns)) {
      for (const col of columns) {
        if (!col.name || !isSafeIdentifier(col.name)) continue;
        let def = `${quoteIdent(col.name)} ${col.type || 'TEXT'}`;
        if (col.notNull) def += ' NOT NULL';
        if (col.default) def += ` DEFAULT ${col.default}`;
        columnDefs.push(def);
        if (col.primaryKey) primaryKeys.push(quoteIdent(col.name));
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
    const sql = `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(tableName)} (${columnDefs.join(', ')});`;

    await dbPool.query(sql);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'create_table',
      target: `${dbName}.${schema}.${tableName}`
    });

    setFlash(req, 'success', `Table ${schema}.${tableName} created.`);
    return res.redirect(`/db/${dbName}`);
  })
);

// Table management page (structure, data, indexes, constraints)
app.get(
  '/db/:dbName/table/:schema/:table/manage',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid table reference.');
      return res.redirect(`/db/${dbName}`);
    }

    const limit = Math.min(Number.parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(Number.parseInt(req.query.offset || '0', 10), 0);

    const dbPool = getPoolForDb(config.pg, dbName);

    // Get columns with more detail
    const columnsResult = await dbPool.query(
      `SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
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
       ORDER BY c.ordinal_position;`,
      [schema, table]
    );

    // Get row count
    const countResult = await dbPool.query(
      `SELECT COUNT(*) as count FROM ${quoteIdent(schema)}.${quoteIdent(table)};`
    );
    const totalRows = parseInt(countResult.rows[0].count, 10);

    // Get rows
    const rowsResult = await dbPool.query(
      `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );

    // Get indexes
    const indexesResult = await dbPool.query(
      `SELECT indexname, indexdef,
              CASE WHEN indexdef LIKE '%UNIQUE%' THEN true ELSE false END as is_unique,
              CASE WHEN indexdef LIKE '%btree%' THEN 'btree'
                   WHEN indexdef LIKE '%hash%' THEN 'hash'
                   WHEN indexdef LIKE '%gin%' THEN 'gin'
                   WHEN indexdef LIKE '%gist%' THEN 'gist'
                   ELSE 'other' END as index_type,
              regexp_replace(indexdef, '.*\\((.*)\\)', '\\1') as columns
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2;`,
      [schema, table]
    );

    // Get constraints
    const constraintsResult = await dbPool.query(
      `SELECT tc.constraint_name, tc.constraint_type,
              pg_get_constraintdef(pgc.oid) as definition
       FROM information_schema.table_constraints tc
       LEFT JOIN pg_constraint pgc ON tc.constraint_name = pgc.conname
       WHERE tc.table_schema = $1 AND tc.table_name = $2;`,
      [schema, table]
    );

    res.render('table-manage', {
      title: `${schema}.${table}`,
      dbName,
      schema,
      table,
      columns: columnsResult.rows,
      rows: rowsResult.rows,
      indexes: indexesResult.rows,
      constraints: constraintsResult.rows,
      totalRows,
      limit,
      offset
    });
  })
);

// Add column
app.post(
  '/db/:dbName/table/:schema/:table/column/add',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { columnName, dataType, notNull, defaultValue } = req.body;

    if (![dbName, schema, table, columnName].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    let sql = `ALTER TABLE ${quoteIdent(schema)}.${quoteIdent(table)} ADD COLUMN ${quoteIdent(columnName)} ${dataType}`;
    if (notNull) sql += ' NOT NULL';
    if (defaultValue) sql += ` DEFAULT ${defaultValue}`;

    await dbPool.query(sql);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'add_column',
      target: `${dbName}.${schema}.${table}.${columnName}`
    });

    setFlash(req, 'success', `Column ${columnName} added.`);
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage`);
  })
);

// Drop column
app.post(
  '/db/:dbName/table/:schema/:table/column/drop',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { columnName } = req.body;

    if (![dbName, schema, table, columnName].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(
      `ALTER TABLE ${quoteIdent(schema)}.${quoteIdent(table)} DROP COLUMN ${quoteIdent(columnName)};`
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'drop_column',
      target: `${dbName}.${schema}.${table}.${columnName}`
    });

    setFlash(req, 'success', `Column ${columnName} dropped.`);
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage`);
  })
);

// Drop table
app.post(
  '/db/:dbName/table/:schema/:table/drop',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`DROP TABLE ${quoteIdent(schema)}.${quoteIdent(table)};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'drop_table',
      target: `${dbName}.${schema}.${table}`
    });

    setFlash(req, 'success', `Table ${schema}.${table} dropped.`);
    return res.redirect(`/db/${dbName}`);
  })
);

// Truncate table
app.post(
  '/db/:dbName/table/:schema/:table/truncate',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`TRUNCATE TABLE ${quoteIdent(schema)}.${quoteIdent(table)};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'truncate_table',
      target: `${dbName}.${schema}.${table}`
    });

    setFlash(req, 'success', `Table ${schema}.${table} truncated.`);
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=data`);
  })
);

// ============================================
// Data Operations (INSERT/UPDATE/DELETE)
// ============================================

// Insert row
app.post(
  '/db/:dbName/table/:schema/:table/row/insert',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { _csrf, _method, ...rowData } = req.body;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=data`);
    }

    const columns = [];
    const values = [];
    const placeholders = [];
    let i = 1;

    for (const [key, value] of Object.entries(rowData)) {
      if (isSafeIdentifier(key) && value !== '') {
        columns.push(quoteIdent(key));
        values.push(value);
        placeholders.push(`$${i++}`);
      }
    }

    if (columns.length === 0) {
      setFlash(req, 'error', 'No data provided.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=data`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(
      `INSERT INTO ${quoteIdent(schema)}.${quoteIdent(table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')});`,
      values
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'insert_row',
      target: `${dbName}.${schema}.${table}`
    });

    setFlash(req, 'success', 'Row inserted.');
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=data`);
  })
);

// Delete row (via JSON)
app.post(
  '/db/:dbName/table/:schema/:table/row/delete',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const rowData = req.body;

    if (![dbName, schema, table].every(isSafeIdentifier)) {
      return res.status(400).json({ error: 'Invalid names.' });
    }

    const conditions = [];
    const values = [];
    let i = 1;

    for (const [key, value] of Object.entries(rowData)) {
      if (isSafeIdentifier(key)) {
        if (value === null) {
          conditions.push(`${quoteIdent(key)} IS NULL`);
        } else {
          conditions.push(`${quoteIdent(key)} = $${i++}`);
          values.push(value);
        }
      }
    }

    if (conditions.length === 0) {
      return res.status(400).json({ error: 'No conditions provided.' });
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    // PostgreSQL doesn't support LIMIT in DELETE, use ctid to delete only first matching row
    await dbPool.query(
      `DELETE FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ctid = (SELECT ctid FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ${conditions.join(' AND ')} LIMIT 1);`,
      values
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'delete_row',
      target: `${dbName}.${schema}.${table}`
    });

    res.json({ success: true });
  })
);

// ============================================
// Index Management
// ============================================

// Create index
app.post(
  '/db/:dbName/table/:schema/:table/index/create',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { indexName, columns, unique } = req.body;

    if (![dbName, schema, table, indexName].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=indexes`);
    }

    const columnList = columns.split(',').map(c => c.trim()).filter(isSafeIdentifier);
    if (columnList.length === 0) {
      setFlash(req, 'error', 'Invalid column names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=indexes`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const uniqueClause = unique ? 'UNIQUE ' : '';
    await dbPool.query(
      `CREATE ${uniqueClause}INDEX ${quoteIdent(indexName)} ON ${quoteIdent(schema)}.${quoteIdent(table)} (${columnList.map(quoteIdent).join(', ')});`
    );

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'create_index',
      target: `${dbName}.${schema}.${table}.${indexName}`
    });

    setFlash(req, 'success', `Index ${indexName} created.`);
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=indexes`);
  })
);

// Drop index
app.post(
  '/db/:dbName/table/:schema/:table/index/drop',
  asyncHandler(async (req, res) => {
    const { dbName, schema, table } = req.params;
    const { indexName } = req.body;

    if (![dbName, schema, indexName].every(isSafeIdentifier)) {
      setFlash(req, 'error', 'Invalid names.');
      return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=indexes`);
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query(`DROP INDEX ${quoteIdent(schema)}.${quoteIdent(indexName)};`);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'drop_index',
      target: `${dbName}.${schema}.${indexName}`
    });

    setFlash(req, 'success', `Index ${indexName} dropped.`);
    return res.redirect(`/db/${dbName}/table/${schema}/${table}/manage?tab=indexes`);
  })
);

// ============================================
// Performance Monitoring
// ============================================

app.get(
  '/performance',
  asyncHandler(async (req, res) => {
    // Server stats
    const versionResult = await adminPool.query('SELECT version();');
    const uptimeResult = await adminPool.query(
      `SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime;`
    );
    const connectionsResult = await adminPool.query(
      `SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active';`
    );
    const maxConnResult = await adminPool.query('SHOW max_connections;');
    const totalSizeResult = await adminPool.query(
      `SELECT SUM(pg_database_size(datname)) as total FROM pg_database WHERE datistemplate = false;`
    );
    const dbCountResult = await adminPool.query(
      `SELECT count(*) as count FROM pg_database WHERE datistemplate = false;`
    );

    // Active connections
    const activeConnsResult = await adminPool.query(
      `SELECT pid, datname, usename, client_addr, state, query,
              date_trunc('second', now() - query_start) as duration
       FROM pg_stat_activity
       WHERE pid <> pg_backend_pid()
       ORDER BY query_start DESC NULLS LAST
       LIMIT 50;`
    );

    // Database sizes
    const dbSizesResult = await adminPool.query(
      `SELECT d.datname, pg_database_size(d.datname) as size_bytes,
              (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as numbackends
       FROM pg_database d
       WHERE datistemplate = false
       ORDER BY pg_database_size(d.datname) DESC;`
    );

    // Locks
    const locksResult = await adminPool.query(
      `SELECT l.pid, d.datname, c.relname, l.locktype, l.mode, l.granted
       FROM pg_locks l
       LEFT JOIN pg_database d ON l.database = d.oid
       LEFT JOIN pg_class c ON l.relation = c.oid
       WHERE NOT l.granted OR l.locktype = 'relation'
       LIMIT 50;`
    );

    // Slow queries (if pg_stat_statements is available)
    let slowQueries = [];
    try {
      const slowResult = await adminPool.query(
        `SELECT query, calls, total_exec_time as total_time,
                mean_exec_time as mean_time, rows
         FROM pg_stat_statements
         ORDER BY mean_exec_time DESC
         LIMIT 20;`
      );
      slowQueries = slowResult.rows;
    } catch (e) {
      // pg_stat_statements not available
    }

    // Replication status
    let replication = [];
    try {
      const repResult = await adminPool.query(
        `SELECT client_addr, state, sent_lsn, write_lsn, replay_lag
         FROM pg_stat_replication;`
      );
      replication = repResult.rows;
    } catch (e) {
      // Not available
    }

    res.render('performance', {
      title: 'Performance',
      stats: {
        version: versionResult.rows[0].version,
        uptime: uptimeResult.rows[0].uptime || 'N/A',
        activeConnections: connectionsResult.rows[0].active,
        maxConnections: maxConnResult.rows[0].max_connections,
        totalSize: totalSizeResult.rows[0].total,
        databaseCount: dbCountResult.rows[0].count
      },
      connections: activeConnsResult.rows,
      databases: dbSizesResult.rows,
      locks: locksResult.rows,
      slowQueries,
      replication
    });
  })
);

// Kill connection
app.post(
  '/performance/kill',
  asyncHandler(async (req, res) => {
    const { pid } = req.body;
    const pidNum = parseInt(pid, 10);

    if (isNaN(pidNum)) {
      setFlash(req, 'error', 'Invalid PID.');
      return res.redirect('/performance');
    }

    await adminPool.query('SELECT pg_terminate_backend($1);', [pidNum]);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'kill_connection',
      target: String(pidNum)
    });

    setFlash(req, 'success', `Connection ${pidNum} terminated.`);
    return res.redirect('/performance');
  })
);

// Run VACUUM
app.post(
  '/performance/vacuum',
  asyncHandler(async (req, res) => {
    const { dbName, analyze } = req.body;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/performance');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const cmd = analyze ? 'VACUUM ANALYZE;' : 'VACUUM;';
    await dbPool.query(cmd);

    await logAudit(config.auditLogPath, {
      actor: req.session.user.id,
      action: 'vacuum',
      target: dbName,
      metadata: { analyze: Boolean(analyze) }
    });

    setFlash(req, 'success', `VACUUM completed on ${dbName}.`);
    return res.redirect('/performance');
  })
);

// ============================================
// Backup & Restore
// ============================================

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');

// Ensure backup directory exists
await fs.mkdir(BACKUP_DIR, { recursive: true });

app.get(
  '/backup',
  asyncHandler(async (req, res) => {
    const dbResult = await adminPool.query(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;`
    );

    // List backup files
    let backups = [];
    try {
      const files = await fs.readdir(BACKUP_DIR);
      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar') || file.endsWith('.gz')) {
          const stat = await fs.stat(path.join(BACKUP_DIR, file));
          const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2})/);
          backups.push({
            filename: file,
            database: match ? match[1] : null,
            size: stat.size,
            created: stat.mtime.toISOString().replace('T', ' ').substring(0, 19)
          });
        }
      }
      backups.sort((a, b) => b.created.localeCompare(a.created));
    } catch (e) {
      // Directory might not exist yet
    }

    res.render('backup', {
      title: 'Backup & Restore',
      databases: dbResult.rows,
      backups
    });
  })
);

// Create backup
app.post(
  '/backup/create',
  asyncHandler(async (req, res) => {
    const { dbName, format, schemaOnly, dataOnly, compress } = req.body;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/backup');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let ext = format === 'custom' ? 'dump' : format === 'tar' ? 'tar' : 'sql';
    if (compress && ext === 'sql') ext = 'sql.gz';
    const filename = `${dbName}_${timestamp}.${ext}`;
    const filepath = path.join(BACKUP_DIR, filename);

    let cmd = `PGPASSWORD="${config.pg.password}" pg_dump -h ${config.pg.host} -p ${config.pg.port} -U ${config.pg.user}`;

    if (format === 'custom') cmd += ' -Fc';
    else if (format === 'tar') cmd += ' -Ft';
    else cmd += ' -Fp';

    if (schemaOnly) cmd += ' --schema-only';
    if (dataOnly) cmd += ' --data-only';

    cmd += ` ${dbName}`;

    if (compress && format === 'plain') {
      cmd += ` | gzip > "${filepath}"`;
    } else {
      cmd += ` > "${filepath}"`;
    }

    try {
      await execAsync(cmd, { shell: '/bin/bash' });

      await logAudit(config.auditLogPath, {
        actor: req.session.user.id,
        action: 'create_backup',
        target: dbName,
        metadata: { filename }
      });

      setFlash(req, 'success', `Backup created: ${filename}`);
    } catch (err) {
      setFlash(req, 'error', `Backup failed: ${err.message}`);
    }

    return res.redirect('/backup');
  })
);

// Download backup
app.get(
  '/backup/download/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      setFlash(req, 'error', 'Invalid filename.');
      return res.redirect('/backup');
    }

    const filepath = path.join(BACKUP_DIR, filename);

    try {
      await fs.access(filepath);
      res.download(filepath);
    } catch (e) {
      setFlash(req, 'error', 'Backup file not found.');
      return res.redirect('/backup');
    }
  })
);

// Delete backup
app.post(
  '/backup/delete',
  asyncHandler(async (req, res) => {
    const { filename } = req.body;

    if (filename.includes('..') || filename.includes('/')) {
      setFlash(req, 'error', 'Invalid filename.');
      return res.redirect('/backup');
    }

    const filepath = path.join(BACKUP_DIR, filename);

    try {
      await fs.unlink(filepath);

      await logAudit(config.auditLogPath, {
        actor: req.session.user.id,
        action: 'delete_backup',
        target: filename
      });

      setFlash(req, 'success', `Backup ${filename} deleted.`);
    } catch (e) {
      setFlash(req, 'error', 'Failed to delete backup.');
    }

    return res.redirect('/backup');
  })
);

// Export CSV
app.post(
  '/backup/export-csv',
  asyncHandler(async (req, res) => {
    const { dbName, tableName, query } = req.body;

    if (!isSafeIdentifier(dbName)) {
      setFlash(req, 'error', 'Invalid database name.');
      return res.redirect('/backup');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    let sql = query && query.trim() ? query : null;

    if (!sql && tableName) {
      const parts = tableName.split('.');
      if (parts.length === 2 && parts.every(isSafeIdentifier)) {
        sql = `SELECT * FROM ${quoteIdent(parts[0])}.${quoteIdent(parts[1])}`;
      }
    }

    if (!sql) {
      setFlash(req, 'error', 'No table or query provided.');
      return res.redirect('/backup');
    }

    try {
      const result = await dbPool.query(sql);

      if (result.rows.length === 0) {
        setFlash(req, 'error', 'No data to export.');
        return res.redirect('/backup');
      }

      const columns = Object.keys(result.rows[0]);
      let csv = columns.join(',') + '\n';

      for (const row of result.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        });
        csv += values.join(',') + '\n';
      }

      const filename = `export_${dbName}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      setFlash(req, 'error', `Export failed: ${err.message}`);
      return res.redirect('/backup');
    }
  })
);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    setFlash(req, 'error', 'Your session expired. Please try again.');
    return res.status(403).redirect('/login');
  }

  console.error(err);
  setFlash(req, 'error', 'Something went wrong.');
  return res.status(500).redirect('back');
});

const shutdown = async () => {
  await closePools();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(config.port, () => {
  console.log(`DB dashboard listening on :${config.port}`);
  if (!config.adminPasswordHash && config.adminPassword === 'ChangeMe-Now-123!') {
    console.warn('Default admin password is set. Update ADMIN_PASSWORD.');
  }
});
