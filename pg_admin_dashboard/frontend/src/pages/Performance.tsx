import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '../services/api';

// Icons
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const KillIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ConnectionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const StorageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(duration: string | null): string {
  if (!duration) return '-';
  return duration;
}

interface ServerStats {
  version: string;
  uptime: string;
  activeConnections: number;
  maxConnections: number;
  totalSize: number;
  databaseCount: number;
}

interface ConnectionInfo {
  pid: number;
  datname: string;
  usename: string;
  client_addr: string;
  state: string;
  query: string;
  duration: string;
}

interface DatabaseSizeInfo {
  datname: string;
  size_bytes: number;
  numbackends: number;
}

interface LockInfo {
  pid: number;
  datname: string;
  relname: string;
  locktype: string;
  mode: string;
  granted: boolean;
}

interface SlowQueryInfo {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
}

interface PerformanceData {
  stats: ServerStats;
  connections: ConnectionInfo[];
  databases: DatabaseSizeInfo[];
  locks: LockInfo[];
  slowQueries: SlowQueryInfo[];
}

export function Performance() {
  const queryClient = useQueryClient();

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['performance'],
    queryFn: performanceApi.getStats,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const data = response?.data as PerformanceData | undefined;

  const killMutation = useMutation({
    mutationFn: (pid: number) => performanceApi.killConnection(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });

  const vacuumMutation = useMutation({
    mutationFn: ({ dbName, analyze }: { dbName: string; analyze: boolean }) =>
      performanceApi.vacuum(dbName, analyze),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-text-muted text-sm">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const connectionPercent = data?.stats
    ? Math.round((data.stats.activeConnections / data.stats.maxConnections) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent">
            <ChartIcon />
          </div>
          <div>
            <h1 className="page-title">Performance Monitor</h1>
            <p className="page-subtitle">Real-time database performance metrics (auto-refresh: 10s)</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshIcon />
          Refresh Now
        </button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-stats">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Connections</p>
                <p className="text-3xl font-bold mt-1">
                  <span className={connectionPercent > 80 ? 'text-danger' : connectionPercent > 60 ? 'text-warning' : 'text-success'}>
                    {data.stats.activeConnections}
                  </span>
                  <span className="text-text-muted text-lg"> / {data.stats.maxConnections}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ConnectionIcon />
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-panel-hover rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${connectionPercent > 80 ? 'bg-danger' : connectionPercent > 60 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${connectionPercent}%` }}
              />
            </div>
          </div>
          <div className="card-stats">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Total Size</p>
                <p className="text-3xl font-bold mt-1">{formatBytes(data.stats.totalSize)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <StorageIcon />
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Uptime</p>
                <p className="text-3xl font-bold mt-1 text-success">{data.stats.uptime}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <ClockIcon />
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Databases</p>
                <p className="text-3xl font-bold mt-1">{data.stats.databaseCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info">
                <DatabaseIcon />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PostgreSQL Version */}
      {data?.stats?.version && (
        <div className="panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-panel-hover flex items-center justify-center text-text-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-dim text-xs font-medium uppercase tracking-wider mb-1">PostgreSQL Version</p>
            <p className="text-sm font-mono text-text-muted truncate">{data.stats.version}</p>
          </div>
        </div>
      )}

      {/* Active Connections */}
      <div className="panel overflow-hidden">
        <div className="p-5 border-b border-panel-border flex items-center justify-between bg-panel-hover/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ConnectionIcon />
            </div>
            <div>
              <h2 className="font-semibold">Active Connections</h2>
              <p className="text-text-dim text-xs">Monitor and manage active database connections</p>
            </div>
          </div>
          <span className="badge-primary">{data?.connections?.length || 0} active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>Database</th>
                <th>User</th>
                <th>Client</th>
                <th>State</th>
                <th>Duration</th>
                <th>Query</th>
                <th className="w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.connections?.map((conn) => (
                <tr key={conn.pid}>
                  <td className="font-mono text-primary">{conn.pid}</td>
                  <td className="font-medium">{conn.datname}</td>
                  <td>{conn.usename}</td>
                  <td className="font-mono text-xs text-text-muted">{conn.client_addr || '-'}</td>
                  <td>
                    <span className={conn.state === 'active' ? 'badge-success' : conn.state === 'idle' ? 'badge-info' : 'badge-warning'}>
                      {conn.state}
                    </span>
                  </td>
                  <td className="text-text-muted">{formatDuration(conn.duration)}</td>
                  <td className="max-w-xs">
                    <span className="block truncate text-xs font-mono text-text-muted" title={conn.query}>
                      {conn.query || '-'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => killMutation.mutate(conn.pid)}
                      disabled={killMutation.isPending}
                      className="btn-danger text-xs px-2 py-1"
                      title="Terminate connection"
                    >
                      <KillIcon />
                      Kill
                    </button>
                  </td>
                </tr>
              ))}
              {(!data?.connections || data.connections.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <p className="text-text-muted">No active connections</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Sizes */}
      <div className="panel overflow-hidden">
        <div className="p-5 border-b border-panel-border flex items-center gap-3 bg-panel-hover/30">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            <StorageIcon />
          </div>
          <div>
            <h2 className="font-semibold">Database Sizes</h2>
            <p className="text-text-dim text-xs">Storage usage and maintenance actions</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Database</th>
                <th>Size</th>
                <th>Connections</th>
                <th>Maintenance Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.databases?.map((db) => (
                <tr key={db.datname}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center text-text-muted">
                        <DatabaseIcon />
                      </div>
                      <span className="font-medium">{db.datname}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-accent">{formatBytes(db.size_bytes)}</span>
                  </td>
                  <td>
                    <span className={db.numbackends > 0 ? 'badge-success' : 'badge-info'}>
                      {db.numbackends} {db.numbackends === 1 ? 'connection' : 'connections'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => vacuumMutation.mutate({ dbName: db.datname, analyze: false })}
                        disabled={vacuumMutation.isPending}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        {vacuumMutation.isPending ? <span className="spinner spinner-sm" /> : null}
                        VACUUM
                      </button>
                      <button
                        onClick={() => vacuumMutation.mutate({ dbName: db.datname, analyze: true })}
                        disabled={vacuumMutation.isPending}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        {vacuumMutation.isPending ? <span className="spinner spinner-sm" /> : null}
                        VACUUM ANALYZE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.databases || data.databases.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <p className="text-text-muted">No databases found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Locks */}
      {data?.locks && data.locks.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="p-5 border-b border-panel-border flex items-center justify-between bg-warning/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Lock Monitor</h2>
                <p className="text-text-dim text-xs">Active database locks that may cause blocking</p>
              </div>
            </div>
            <span className="badge-warning">{data.locks.length} locks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Database</th>
                  <th>Relation</th>
                  <th>Lock Type</th>
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.locks.map((lock, i) => (
                  <tr key={i}>
                    <td className="font-mono text-primary">{lock.pid}</td>
                    <td className="font-medium">{lock.datname}</td>
                    <td className="text-text-muted">{lock.relname || '-'}</td>
                    <td><span className="badge-info">{lock.locktype}</span></td>
                    <td className="text-xs font-mono">{lock.mode}</td>
                    <td>
                      <span className={lock.granted ? 'badge-success' : 'badge-danger'}>
                        {lock.granted ? 'Granted' : 'Waiting'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow Queries */}
      {data?.slowQueries && data.slowQueries.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="p-5 border-b border-panel-border flex items-center gap-3 bg-panel-hover/30">
            <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Slow Queries</h2>
              <p className="text-text-dim text-xs">Top queries by execution time (via pg_stat_statements)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Calls</th>
                  <th>Total Time</th>
                  <th>Mean Time</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody>
                {data.slowQueries.map((sq, i) => (
                  <tr key={i}>
                    <td className="max-w-md">
                      <span className="block truncate font-mono text-xs text-text-muted" title={sq.query}>
                        {sq.query}
                      </span>
                    </td>
                    <td className="font-mono">{sq.calls.toLocaleString()}</td>
                    <td>
                      <span className={sq.total_time > 1000 ? 'text-danger font-medium' : 'text-text-muted'}>
                        {sq.total_time.toFixed(2)} ms
                      </span>
                    </td>
                    <td>
                      <span className={sq.mean_time > 100 ? 'text-warning font-medium' : 'text-text-muted'}>
                        {sq.mean_time.toFixed(2)} ms
                      </span>
                    </td>
                    <td className="font-mono text-text-muted">{sq.rows.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
