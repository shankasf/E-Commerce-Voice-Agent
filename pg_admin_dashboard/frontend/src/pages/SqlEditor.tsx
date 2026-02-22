import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryApi } from '../services/api';
import { useSettingsStore } from '../store/settingsStore';
import type { QueryResult } from '../types';
import clsx from 'clsx';

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface QueryHistoryEntry {
  id: string;
  sql: string;
  duration: number;
  rowCount: number | null;
  command: string;
  executedAt: string;
}

export function SqlEditor() {
  const { dbName } = useParams<{ dbName: string }>();
  const queryClient = useQueryClient();
  const [sql, setSql] = useState('SELECT * FROM information_schema.tables LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { editorFontSize, editorWordWrap, editorMinimap } = useSettingsStore();

  const executeMutation = useMutation({
    mutationFn: () => queryApi.execute(dbName!, sql),
    onSuccess: (response) => {
      if (response.success) {
        setResult(response.data as QueryResult);
        queryClient.invalidateQueries({ queryKey: ['queryHistory', dbName] });
      }
    },
  });

  const { data: historyResponse } = useQuery({
    queryKey: ['queryHistory', dbName],
    queryFn: () => queryApi.getHistory(dbName!, 50),
    enabled: showHistory && !!dbName,
  });

  const history = (historyResponse?.data as QueryHistoryEntry[]) || [];

  const clearHistoryMutation = useMutation({
    mutationFn: () => queryApi.clearHistory(dbName!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queryHistory', dbName] });
    },
  });

  const handleExecute = useCallback(() => {
    if (sql.trim()) {
      executeMutation.mutate();
    }
  }, [sql, executeMutation]);

  const handleExportCSV = useCallback(() => {
    if (!result?.rows.length) return;

    const headers = result.fields.map((f) => f.name);
    const csvContent = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleLoadFromHistory = (entry: QueryHistoryEntry) => {
    setSql(entry.sql);
    setShowHistory(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="h-full flex gap-4">
      {/* Main Content */}
      <div className={clsx('flex-1 flex flex-col gap-4', showHistory && 'min-w-0')}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">SQL Editor</h1>
            <p className="text-text-muted text-sm mt-1">{dbName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={clsx('btn-secondary', showHistory && 'bg-primary/20')}
            >
              <HistoryIcon />
              History
            </button>
            <button
              onClick={handleExecute}
              disabled={executeMutation.isPending || !sql.trim()}
              className="btn-primary"
            >
              {executeMutation.isPending ? (
                <>
                  <span className="animate-spin">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Run (Ctrl+Enter)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="panel flex-shrink-0 overflow-hidden" style={{ height: '300px' }}>
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sql}
            onChange={(value) => setSql(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: editorMinimap },
              fontSize: editorFontSize,
              fontFamily: 'Fira Code, Monaco, Consolas, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: editorWordWrap ? 'on' : 'off',
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
            }}
            onMount={(editor) => {
              // Add Ctrl+Enter shortcut
              editor.addAction({
                id: 'execute-query',
                label: 'Execute Query',
                keybindings: [
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (window as any).monaco?.KeyMod.CtrlCmd | (window as any).monaco?.KeyCode.Enter,
                ],
                run: () => handleExecute(),
              });
            }}
          />
        </div>

        {/* Results */}
        <div className="flex-1 panel overflow-hidden flex flex-col min-h-0">
          {/* Results Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Results</span>
              {result && (
                <>
                  <span className="text-text-muted text-sm">
                    {result.rowCount?.toLocaleString() || result.rows.length} rows
                  </span>
                  <span className="text-text-muted text-sm">
                    {result.duration}ms
                  </span>
                  {result.command && (
                    <span className="badge-primary">{result.command}</span>
                  )}
                </>
              )}
            </div>
            {result && result.rows.length > 0 && (
              <button onClick={handleExportCSV} className="btn-ghost text-sm">
                <DownloadIcon />
                Export CSV
              </button>
            )}
          </div>

          {/* Error */}
          {executeMutation.isError && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="flex items-start gap-3 max-w-2xl w-full bg-danger/10 border border-danger/20 rounded-lg p-4">
                <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-danger">Query Error</p>
                  <p className="text-sm text-danger/80 mt-1 font-mono break-all">
                    {(() => {
                      const err = executeMutation.error as { response?: { data?: { error?: { message?: string } } }; message?: string };
                      return err?.response?.data?.error?.message || err?.message || 'Query failed';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {!executeMutation.isError && result?.rows.length ? (
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-bg-secondary">
                    {result.fields.map((field) => (
                      <th key={field.name} className="table-header text-left whitespace-nowrap">
                        {field.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-panel-hover">
                      {result.fields.map((field) => (
                        <td key={field.name} className="table-cell">
                          <span className="truncate block max-w-xs" title={String(row[field.name] ?? '')}>
                            {row[field.name] === null ? (
                              <span className="text-text-dim italic">NULL</span>
                            ) : typeof row[field.name] === 'object' ? (
                              JSON.stringify(row[field.name])
                            ) : (
                              String(row[field.name])
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !executeMutation.isError && result ? (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              Query executed successfully. No rows returned.
            </div>
          ) : !executeMutation.isError ? (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              Run a query to see results
            </div>
          ) : null}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="w-80 panel flex flex-col overflow-hidden">
          <div className="p-4 border-b border-panel-border flex items-center justify-between">
            <h3 className="font-semibold">Query History</h3>
            <button
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending || history.length === 0}
              className="btn-ghost btn-icon text-danger"
              title="Clear history"
            >
              <TrashIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-sm">
                No query history yet
              </div>
            ) : (
              <div className="divide-y divide-panel-border">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleLoadFromHistory(entry)}
                    className="w-full p-3 text-left hover:bg-panel-hover transition-colors"
                  >
                    <div className="text-xs text-text-muted mb-1">
                      {formatDate(entry.executedAt)} · {entry.duration}ms
                      {entry.rowCount !== null && ` · ${entry.rowCount} rows`}
                    </div>
                    <div className="text-sm font-mono truncate">{entry.sql}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
