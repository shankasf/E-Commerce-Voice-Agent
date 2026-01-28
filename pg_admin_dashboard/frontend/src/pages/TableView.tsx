import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableApi } from '../services/api';
import type { ColumnInfo } from '../types';

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
  </svg>
);

export function TableView() {
  const { dbName, schema, table } = useParams<{ dbName: string; schema: string; table: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'data' | 'structure' | 'indexes'>('data');
  const [page, setPage] = useState(0);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [newRow, setNewRow] = useState<Record<string, unknown>>({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [showAddIndex, setShowAddIndex] = useState(false);
  const [newIndex, setNewIndex] = useState({ name: '', columns: '', unique: false });
  const limit = 50;

  const { data: tableData, isLoading, refetch } = useQuery({
    queryKey: ['table', dbName, schema, table, page],
    queryFn: () => tableApi.get(dbName!, schema!, table!, limit, page * limit),
    enabled: !!dbName && !!schema && !!table,
  });

  const data = tableData?.data as {
    columns: ColumnInfo[];
    rows: Record<string, unknown>[];
    indexes: { indexname: string; is_unique: boolean; columns: string }[];
    constraints: { constraint_name: string; constraint_type: string; definition: string }[];
  } | undefined;

  const meta = tableData?.meta as { total: number; limit: number; offset: number } | undefined;

  const columns = data?.columns || [];
  const rows = data?.rows || [];
  const indexes = data?.indexes || [];
  const total = meta?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Find primary key column
  const primaryKeyColumn = useMemo(() => {
    const pkCol = columns.find((c) => c.is_primary);
    return pkCol?.column_name || 'id';
  }, [columns]);

  const insertMutation = useMutation({
    mutationFn: (rowData: Record<string, unknown>) =>
      tableApi.insertRow(dbName!, schema!, table!, rowData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', dbName, schema, table] });
      setShowAddRow(false);
      setNewRow({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tableApi.updateRow(dbName!, schema!, table!, id, data, primaryKeyColumn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', dbName, schema, table] });
      setEditingRow(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      tableApi.deleteRow(dbName!, schema!, table!, id, primaryKeyColumn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', dbName, schema, table] });
    },
  });

  const createIndexMutation = useMutation({
    mutationFn: (indexData: { name: string; columns: string; unique: boolean }) =>
      tableApi.createIndex(dbName!, schema!, table!, indexData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', dbName, schema, table] });
      setShowAddIndex(false);
      setNewIndex({ name: '', columns: '', unique: false });
    },
  });

  const dropIndexMutation = useMutation({
    mutationFn: (indexName: string) =>
      tableApi.dropIndex(dbName!, schema!, table!, indexName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', dbName, schema, table] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{table}</h1>
          <p className="text-text-muted text-sm mt-1">
            {schema} | {total.toLocaleString()} rows
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-icon" title="Refresh">
            <RefreshIcon />
          </button>
          <button
            onClick={() => setShowAddRow(true)}
            className="btn-primary"
          >
            <PlusIcon />
            Add Row
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-panel-border">
        <nav className="flex gap-4">
          {(['data', 'structure', 'indexes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'nav-tab-active' : 'nav-tab'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-secondary">
                  {columns.map((col) => (
                    <th key={col.column_name} className="table-header text-left whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {col.is_primary && <KeyIcon />}
                        <span>{col.column_name}</span>
                        <span className="text-text-dim text-xs font-normal">
                          {col.data_type}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="table-header w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-panel-hover">
                    {columns.map((col) => (
                      <td key={col.column_name} className="table-cell">
                        {editingRow === row ? (
                          <input
                            type="text"
                            defaultValue={String(row[col.column_name] ?? '')}
                            onChange={(e) => {
                              (editingRow as Record<string, unknown>)[col.column_name] = e.target.value;
                            }}
                            className="input py-1 text-sm"
                          />
                        ) : (
                          <span className="truncate block max-w-xs" title={String(row[col.column_name] ?? '')}>
                            {row[col.column_name] === null ? (
                              <span className="text-text-dim italic">NULL</span>
                            ) : typeof row[col.column_name] === 'object' ? (
                              JSON.stringify(row[col.column_name])
                            ) : (
                              String(row[col.column_name])
                            )}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="table-cell">
                      <div className="flex gap-1">
                        {editingRow === row ? (
                          <>
                            <button
                              onClick={() => {
                                const id = String(row[primaryKeyColumn]);
                                updateMutation.mutate({ id, data: editingRow });
                              }}
                              className="btn-icon text-success"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRow(null)}
                              className="btn-icon"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingRow({ ...row })}
                              className="btn-icon"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this row?')) {
                                  deleteMutation.mutate(String(row[primaryKeyColumn]));
                                }
                              }}
                              className="btn-icon text-danger"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-panel-border">
              <span className="text-text-muted text-sm">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structure Tab */}
      {activeTab === 'structure' && (
        <div className="panel">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="table-header text-left">Column</th>
                <th className="table-header text-left">Type</th>
                <th className="table-header text-left">Nullable</th>
                <th className="table-header text-left">Default</th>
                <th className="table-header text-left">Primary</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.column_name} className="hover:bg-panel-hover">
                  <td className="table-cell font-medium">{col.column_name}</td>
                  <td className="table-cell">
                    <span className="badge-primary">{col.data_type}</span>
                  </td>
                  <td className="table-cell">
                    {col.is_nullable === 'YES' ? (
                      <span className="text-text-muted">Yes</span>
                    ) : (
                      <span className="text-danger">No</span>
                    )}
                  </td>
                  <td className="table-cell text-text-muted">
                    {col.column_default || '-'}
                  </td>
                  <td className="table-cell">
                    {col.is_primary && <KeyIcon />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Indexes Tab */}
      {activeTab === 'indexes' && (
        <div className="panel">
          <div className="p-4 border-b border-panel-border flex items-center justify-between">
            <h3 className="font-semibold">Indexes</h3>
            <button onClick={() => setShowAddIndex(true)} className="btn-primary">
              <PlusIcon />
              Create Index
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="table-header text-left">Index Name</th>
                <th className="table-header text-left">Columns</th>
                <th className="table-header text-left">Unique</th>
                <th className="table-header text-left w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {indexes.map((idx) => (
                <tr key={idx.indexname} className="hover:bg-panel-hover">
                  <td className="table-cell font-medium">{idx.indexname}</td>
                  <td className="table-cell text-text-muted">{idx.columns}</td>
                  <td className="table-cell">
                    {idx.is_unique ? (
                      <span className="badge-success">Yes</span>
                    ) : (
                      <span className="text-text-muted">No</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => {
                        if (confirm(`Drop index "${idx.indexname}"?`)) {
                          dropIndexMutation.mutate(idx.indexname);
                        }
                      }}
                      disabled={dropIndexMutation.isPending}
                      className="btn-icon text-danger"
                      title="Drop index"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {indexes.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-cell text-center text-text-muted">
                    No indexes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Row Modal */}
      {showAddRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in">
            <h2 className="font-display text-xl font-semibold mb-4">Add Row</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                insertMutation.mutate(newRow);
              }}
              className="space-y-4"
            >
              {columns
                .filter((col) => !col.column_default?.includes('nextval') && !col.column_default?.includes('now()'))
                .map((col) => (
                  <div key={col.column_name}>
                    <label className="label">
                      {col.column_name}
                      {col.is_nullable === 'NO' && !col.column_default && (
                        <span className="text-danger ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={String(newRow[col.column_name] || '')}
                      onChange={(e) => setNewRow({ ...newRow, [col.column_name]: e.target.value })}
                      className="input"
                      placeholder={col.data_type}
                      required={col.is_nullable === 'NO' && !col.column_default}
                    />
                  </div>
                ))}

              {insertMutation.isError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  Failed to insert row
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRow(false);
                    setNewRow({});
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={insertMutation.isPending}
                  className="btn-primary"
                >
                  {insertMutation.isPending ? 'Inserting...' : 'Insert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Index Modal */}
      {showAddIndex && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md animate-fade-in">
            <h2 className="font-display text-xl font-semibold mb-4">Create Index</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createIndexMutation.mutate(newIndex);
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Index Name</label>
                <input
                  type="text"
                  value={newIndex.name}
                  onChange={(e) => setNewIndex({ ...newIndex, name: e.target.value })}
                  className="input"
                  placeholder="idx_column_name"
                  required
                />
              </div>

              <div>
                <label className="label">Columns</label>
                <input
                  type="text"
                  value={newIndex.columns}
                  onChange={(e) => setNewIndex({ ...newIndex, columns: e.target.value })}
                  className="input"
                  placeholder="column1, column2"
                  required
                />
                <p className="text-text-muted text-xs mt-1">
                  Available: {columns.map(c => c.column_name).join(', ')}
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newIndex.unique}
                  onChange={(e) => setNewIndex({ ...newIndex, unique: e.target.checked })}
                  className="rounded border-panel-border bg-bg"
                />
                <span className="text-sm">Unique index</span>
              </label>

              {createIndexMutation.isError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  Failed to create index
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddIndex(false);
                    setNewIndex({ name: '', columns: '', unique: false });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIndexMutation.isPending}
                  className="btn-primary"
                >
                  {createIndexMutation.isPending ? 'Creating...' : 'Create Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
