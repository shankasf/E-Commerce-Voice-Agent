import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { databaseApi } from '../../services/api';
import { useDatabaseStore } from '../../store/databaseStore';
import clsx from 'clsx';

// Icons as simple SVG components
const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BackupIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const FunctionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const TriggerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={clsx('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export function Sidebar() {
  const location = useLocation();
  const { dbName } = useParams();
  const { setDatabases, setTables } = useDatabaseStore();

  const { data: dbResponse } = useQuery({
    queryKey: ['databases'],
    queryFn: databaseApi.list,
    staleTime: 30000,
  });

  const databases = dbResponse?.data || [];

  // Update store when databases are fetched
  if (databases.length > 0) {
    setDatabases(databases);
  }

  const { data: tablesResponse } = useQuery({
    queryKey: ['database', dbName],
    queryFn: () => databaseApi.get(dbName!),
    enabled: !!dbName,
    staleTime: 30000,
  });

  const tables = (tablesResponse?.data as { tables?: { table_schema: string; table_name: string }[] })?.tables || [];

  if (tables.length > 0) {
    setTables(tables);
  }

  // Group tables by schema
  const tablesBySchema = tables.reduce((acc, table) => {
    if (!acc[table.table_schema]) {
      acc[table.table_schema] = [];
    }
    acc[table.table_schema].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <aside className="w-64 bg-panel/50 backdrop-blur-sm border-r border-panel-border flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-panel-border">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dim rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <svg className="w-5 h-5 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight">PG Admin</span>
            <p className="text-2xs text-text-dim">Database Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Home Link */}
        <Link
          to="/"
          className={clsx(
            'sidebar-item mb-2',
            location.pathname === '/' && 'sidebar-item-active'
          )}
        >
          <HomeIcon />
          <span>Dashboard</span>
        </Link>

        {/* Databases Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-2xs font-semibold text-text-dim uppercase tracking-wider">
              Databases
            </span>
            <span className="text-2xs text-text-dim bg-bg-secondary px-1.5 py-0.5 rounded">
              {databases.length}
            </span>
          </div>

          <div className="space-y-0.5">
            {databases.map((db) => (
              <div key={db.datname}>
                <Link
                  to={`/db/${db.datname}`}
                  className={clsx(
                    'sidebar-item group',
                    dbName === db.datname && 'sidebar-item-active'
                  )}
                >
                  <div className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    dbName === db.datname
                      ? 'bg-primary/20 text-primary'
                      : 'bg-bg-secondary text-text-dim group-hover:bg-primary/10 group-hover:text-primary'
                  )}>
                    <DatabaseIcon />
                  </div>
                  <span className="truncate flex-1">{db.datname}</span>
                  {db.datallowconn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-success" title="Active" />
                  )}
                </Link>

                {/* Tables for selected database */}
                {dbName === db.datname && Object.keys(tablesBySchema).length > 0 && (
                  <div className="ml-3 mt-1 pl-3 border-l border-panel-border space-y-0.5">
                    {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
                      <div key={schema}>
                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-2xs text-text-dim">
                          <ChevronIcon open={true} />
                          <span className="font-medium">{schema}</span>
                          <span className="text-text-dim/50">({schemaTables.length})</span>
                        </div>
                        <div className="space-y-0.5">
                          {schemaTables.map((table) => (
                            <Link
                              key={`${schema}.${table.table_name}`}
                              to={`/db/${dbName}/table/${schema}/${table.table_name}`}
                              className={clsx(
                                'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors',
                                location.pathname.includes(`/table/${schema}/${table.table_name}`)
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-text-muted hover:text-text hover:bg-panel-hover'
                              )}
                            >
                              <TableIcon />
                              <span className="truncate">{table.table_name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SQL Editor & Schema Objects (when database is selected) */}
        {dbName && (
          <>
            <div className="pt-4">
              <div className="px-3 py-2">
                <span className="text-2xs font-semibold text-text-dim uppercase tracking-wider">
                  Tools
                </span>
              </div>
              <Link
                to={`/db/${dbName}/sql`}
                className={clsx(
                  'sidebar-item',
                  location.pathname.includes('/sql') && 'sidebar-item-active'
                )}
              >
                <div className={clsx(
                  'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                  location.pathname.includes('/sql')
                    ? 'bg-info/20 text-info'
                    : 'bg-bg-secondary text-text-dim'
                )}>
                  <CodeIcon />
                </div>
                <span>SQL Editor</span>
              </Link>
            </div>

            {/* Schema Objects */}
            <div className="pt-4">
              <div className="px-3 py-2">
                <span className="text-2xs font-semibold text-text-dim uppercase tracking-wider">
                  Schema Objects
                </span>
              </div>
              <div className="space-y-0.5">
                <Link
                  to={`/db/${dbName}/views`}
                  className={clsx(
                    'sidebar-item',
                    location.pathname.includes('/views') && 'sidebar-item-active'
                  )}
                >
                  <div className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    location.pathname.includes('/views')
                      ? 'bg-accent/20 text-accent'
                      : 'bg-bg-secondary text-text-dim'
                  )}>
                    <ViewIcon />
                  </div>
                  <span>Views</span>
                </Link>
                <Link
                  to={`/db/${dbName}/functions`}
                  className={clsx(
                    'sidebar-item',
                    location.pathname.includes('/functions') && 'sidebar-item-active'
                  )}
                >
                  <div className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    location.pathname.includes('/functions')
                      ? 'bg-success/20 text-success'
                      : 'bg-bg-secondary text-text-dim'
                  )}>
                    <FunctionIcon />
                  </div>
                  <span>Functions</span>
                </Link>
                <Link
                  to={`/db/${dbName}/triggers`}
                  className={clsx(
                    'sidebar-item',
                    location.pathname.includes('/triggers') && 'sidebar-item-active'
                  )}
                >
                  <div className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    location.pathname.includes('/triggers')
                      ? 'bg-warning/20 text-warning'
                      : 'bg-bg-secondary text-text-dim'
                  )}>
                    <TriggerIcon />
                  </div>
                  <span>Triggers</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Bottom navigation */}
      <div className="p-3 border-t border-panel-border bg-bg/50">
        <div className="px-3 py-2 mb-1">
          <span className="text-2xs font-semibold text-text-dim uppercase tracking-wider">
            System
          </span>
        </div>
        <div className="space-y-0.5">
          <Link
            to="/performance"
            className={clsx(
              'sidebar-item',
              location.pathname === '/performance' && 'sidebar-item-active'
            )}
          >
            <div className={clsx(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              location.pathname === '/performance'
                ? 'bg-info/20 text-info'
                : 'bg-bg-secondary text-text-dim'
            )}>
              <ChartIcon />
            </div>
            <span>Performance</span>
          </Link>
          <Link
            to="/backup"
            className={clsx(
              'sidebar-item',
              location.pathname === '/backup' && 'sidebar-item-active'
            )}
          >
            <div className={clsx(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              location.pathname === '/backup'
                ? 'bg-accent/20 text-accent'
                : 'bg-bg-secondary text-text-dim'
            )}>
              <BackupIcon />
            </div>
            <span>Backup</span>
          </Link>
          <Link
            to="/users"
            className={clsx(
              'sidebar-item',
              location.pathname === '/users' && 'sidebar-item-active'
            )}
          >
            <div className={clsx(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              location.pathname === '/users'
                ? 'bg-primary/20 text-primary'
                : 'bg-bg-secondary text-text-dim'
            )}>
              <UsersIcon />
            </div>
            <span>Users & Roles</span>
          </Link>
          <Link
            to="/settings"
            className={clsx(
              'sidebar-item',
              location.pathname === '/settings' && 'sidebar-item-active'
            )}
          >
            <div className={clsx(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              location.pathname === '/settings'
                ? 'bg-text-muted/20 text-text-muted'
                : 'bg-bg-secondary text-text-dim'
            )}>
              <SettingsIcon />
            </div>
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
