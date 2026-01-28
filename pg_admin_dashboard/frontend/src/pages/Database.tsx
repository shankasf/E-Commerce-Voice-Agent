import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemaApi, tableApi } from '../services/api';
import type { SchemaOverview } from '../types';
import clsx from 'clsx';

// Column types commonly used in PostgreSQL
const COLUMN_TYPES = [
  'TEXT',
  'VARCHAR(255)',
  'INTEGER',
  'BIGINT',
  'SERIAL',
  'BIGSERIAL',
  'BOOLEAN',
  'TIMESTAMPTZ',
  'TIMESTAMP',
  'DATE',
  'TIME',
  'UUID',
  'JSONB',
  'JSON',
  'NUMERIC',
  'DECIMAL',
  'REAL',
  'DOUBLE PRECISION',
  'BYTEA',
  'INET',
  'CIDR',
  'MACADDR',
  'ARRAY',
];

interface ColumnDefinition {
  id: string;
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string;
  primaryKey: boolean;
  unique: boolean;
}

const createEmptyColumn = (): ColumnDefinition => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'TEXT',
  notNull: false,
  defaultValue: '',
  primaryKey: false,
  unique: false,
});

const TableIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const FunctionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export function Database() {
  const { dbName } = useParams<{ dbName: string }>();
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'views' | 'functions' | 'extensions'>('tables');
  const queryClient = useQueryClient();

  // New table form state
  const [newTableName, setNewTableName] = useState('');
  const [newTableSchema, setNewTableSchema] = useState('public');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { id: crypto.randomUUID(), name: 'id', type: 'BIGSERIAL', notNull: true, defaultValue: '', primaryKey: true, unique: false },
  ]);
  const [addCreatedAt, setAddCreatedAt] = useState(true);
  const [addUpdatedAt, setAddUpdatedAt] = useState(true);

  const { data: schemaResponse, isLoading } = useQuery({
    queryKey: ['schema', dbName, 'full'],
    queryFn: () => schemaApi.getFull(dbName!),
    enabled: !!dbName,
  });

  const schema = schemaResponse?.data as SchemaOverview | undefined;

  const addColumn = () => {
    setColumns([...columns, createEmptyColumn()]);
  };

  const removeColumn = (id: string) => {
    if (columns.length > 1) {
      setColumns(columns.filter((c) => c.id !== id));
    }
  };

  const updateColumn = (id: string, field: keyof ColumnDefinition, value: string | boolean) => {
    setColumns(
      columns.map((c) => {
        if (c.id !== id) return c;
        // If setting primary key, ensure notNull is also set
        if (field === 'primaryKey' && value === true) {
          return { ...c, [field]: value, notNull: true };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const resetForm = () => {
    setNewTableName('');
    setNewTableSchema('public');
    setColumns([
      { id: crypto.randomUUID(), name: 'id', type: 'BIGSERIAL', notNull: true, defaultValue: '', primaryKey: true, unique: false },
    ]);
    setAddCreatedAt(true);
    setAddUpdatedAt(true);
  };

  const createTableMutation = useMutation({
    mutationFn: () => {
      const columnDefs = columns
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name,
          type: c.type,
          notNull: c.notNull,
          defaultValue: c.defaultValue || undefined,
          primaryKey: c.primaryKey,
          unique: c.unique,
        }));
      return tableApi.create(dbName!, newTableSchema, newTableName, columnDefs, {
        addCreatedAt,
        addUpdatedAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schema', dbName] });
      queryClient.invalidateQueries({ queryKey: ['database', dbName] });
      setShowCreateTable(false);
      resetForm();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-text-muted text-sm">Loading schema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">{dbName}</h1>
            <p className="page-subtitle">
              {schema?.tables.length || 0} tables, {schema?.views.length || 0} views, {schema?.functionsCount || 0} functions
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to={`/db/${dbName}/sql`} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            SQL Editor
          </Link>
          <button
            onClick={() => setShowCreateTable(true)}
            className="btn-primary"
          >
            <PlusIcon />
            New Table
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Tables</p>
              <p className="text-3xl font-bold mt-1">{schema?.tables.length || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TableIcon />
            </div>
          </div>
        </div>
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Views</p>
              <p className="text-3xl font-bold mt-1">{schema?.views.length || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <ViewIcon />
            </div>
          </div>
        </div>
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Functions</p>
              <p className="text-3xl font-bold mt-1">{schema?.functionsCount || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
              <FunctionIcon />
            </div>
          </div>
        </div>
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Triggers</p>
              <p className="text-3xl font-bold mt-1">{schema?.triggersCount || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel overflow-hidden">
        <div className="border-b border-panel-border bg-panel-hover/30">
          <nav className="flex">
            {(['tables', 'views', 'functions', 'extensions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-6 py-3.5 text-sm font-medium transition-all relative',
                  activeTab === tab
                    ? 'text-primary bg-panel'
                    : 'text-text-muted hover:text-text hover:bg-panel-hover/50'
                )}
              >
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'tables' && schema?.tables.length ? (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                    {schema.tables.length}
                  </span>
                ) : null}
                {tab === 'views' && schema?.views.length ? (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/10 text-accent rounded">
                    {schema.views.length}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'tables' && (
          <div className="divide-y divide-panel-border">
            {schema?.tables.map((table, index) => (
              <Link
                key={`${table.schema_name}.${table.table_name}`}
                to={`/db/${dbName}/table/${table.schema_name}/${table.table_name}`}
                className="flex items-center gap-4 p-4 hover:bg-panel-hover transition-colors group"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <TableIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium group-hover:text-primary transition-colors truncate">{table.table_name}</p>
                  <p className="text-text-dim text-sm">{table.schema_name}</p>
                </div>
                <svg className="w-5 h-5 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
            {(!schema?.tables || schema.tables.length === 0) && (
              <div className="empty-state py-16">
                <div className="w-16 h-16 rounded-xl bg-panel-hover flex items-center justify-center text-text-dim mb-4">
                  <TableIcon />
                </div>
                <h3 className="empty-state-title">No tables found</h3>
                <p className="empty-state-description">
                  Create your first table to get started with your database.
                </p>
                <button
                  onClick={() => setShowCreateTable(true)}
                  className="btn-primary mt-6"
                >
                  <PlusIcon />
                  Create Table
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'views' && (
          <div className="divide-y divide-panel-border">
            {schema?.views.map((view, index) => (
              <div
                key={`${view.schema_name}.${view.view_name}`}
                className="flex items-center gap-4 p-4 hover:bg-panel-hover/50 transition-colors"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                  <ViewIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{view.view_name}</p>
                  <p className="text-text-dim text-sm">{view.schema_name}</p>
                </div>
              </div>
            ))}
            {(!schema?.views || schema.views.length === 0) && (
              <div className="empty-state py-16">
                <div className="w-16 h-16 rounded-xl bg-panel-hover flex items-center justify-center text-text-dim mb-4">
                  <ViewIcon />
                </div>
                <h3 className="empty-state-title">No views found</h3>
                <p className="empty-state-description">
                  Views will appear here once created.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'extensions' && (
          <div className="divide-y divide-panel-border">
            {schema?.extensions.map((ext, index) => (
              <div
                key={ext.extname}
                className="flex items-center justify-between p-4 hover:bg-panel-hover/50 transition-colors"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{ext.extname}</p>
                    <p className="text-text-dim text-sm">PostgreSQL Extension</p>
                  </div>
                </div>
                <span className="badge-success">v{ext.extversion}</span>
              </div>
            ))}
            {(!schema?.extensions || schema.extensions.length === 0) && (
              <div className="empty-state py-16">
                <h3 className="empty-state-title">No extensions installed</h3>
                <p className="empty-state-description">
                  Use CREATE EXTENSION to add PostgreSQL extensions.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'functions' && (
          <div className="empty-state py-16">
            <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center text-success mb-4">
              <FunctionIcon />
            </div>
            <h3 className="empty-state-title">{schema?.functionsCount || 0} functions available</h3>
            <p className="empty-state-description">
              Use the SQL Editor to view and manage function definitions.
            </p>
            <Link to={`/db/${dbName}/sql`} className="btn-secondary mt-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Open SQL Editor
            </Link>
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      {showCreateTable && (
        <div className="modal-overlay" onClick={() => { setShowCreateTable(false); resetForm(); }}>
          <div className="modal-content !max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <TableIcon />
                </div>
                <div>
                  <h2 className="modal-header mb-0">Create Table</h2>
                  <p className="text-text-muted text-sm mt-1">Define your table structure</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreateTable(false); resetForm(); }}
                className="btn-icon"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTableMutation.mutate();
              }}
              className="space-y-6"
            >
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Schema</label>
                  <input
                    type="text"
                    value={newTableSchema}
                    onChange={(e) => setNewTableSchema(e.target.value)}
                    className="input"
                    placeholder="public"
                  />
                </div>
                <div>
                  <label className="label">Table Name</label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="input"
                    placeholder="my_table"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Columns */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Columns</label>
                  <button
                    type="button"
                    onClick={addColumn}
                    className="btn-ghost text-sm"
                  >
                    <PlusIcon />
                    Add Column
                  </button>
                </div>

                <div className="border border-panel-border rounded-lg overflow-hidden">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-2 p-3 bg-bg-secondary text-xs font-medium text-text-muted">
                    <div className="col-span-3">Name</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-2">Default</div>
                    <div className="col-span-1 text-center">PK</div>
                    <div className="col-span-1 text-center">NN</div>
                    <div className="col-span-1 text-center">UQ</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Column Rows */}
                  <div className="divide-y divide-panel-border">
                    {columns.map((col) => (
                      <div
                        key={col.id}
                        className="grid grid-cols-12 gap-2 p-3 items-center"
                      >
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="column_name"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={col.type}
                            onChange={(e) => updateColumn(col.id, 'type', e.target.value)}
                            className="input text-sm py-1.5"
                          >
                            {COLUMN_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={col.defaultValue}
                            onChange={(e) => updateColumn(col.id, 'defaultValue', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="default"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={col.primaryKey}
                            onChange={(e) => updateColumn(col.id, 'primaryKey', e.target.checked)}
                            className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary"
                            title="Primary Key"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={col.notNull}
                            onChange={(e) => updateColumn(col.id, 'notNull', e.target.checked)}
                            className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary"
                            title="NOT NULL"
                            disabled={col.primaryKey}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={col.unique}
                            onChange={(e) => updateColumn(col.id, 'unique', e.target.checked)}
                            className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary"
                            title="Unique"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeColumn(col.id)}
                            disabled={columns.length <= 1}
                            className={clsx(
                              'p-1.5 rounded hover:bg-danger/10 text-danger',
                              columns.length <= 1 && 'opacity-30 cursor-not-allowed'
                            )}
                            title="Remove column"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 text-xs text-text-muted">
                  PK = Primary Key, NN = NOT NULL, UQ = Unique
                </div>
              </div>

              {/* Auto-generated columns */}
              <div className="space-y-3">
                <label className="label">Auto-generated Columns</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addCreatedAt}
                      onChange={(e) => setAddCreatedAt(e.target.checked)}
                      className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      created_at <span className="text-text-muted">(TIMESTAMPTZ)</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addUpdatedAt}
                      onChange={(e) => setAddUpdatedAt(e.target.checked)}
                      className="w-4 h-4 rounded border-panel-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      updated_at <span className="text-text-muted">(TIMESTAMPTZ)</span>
                    </span>
                  </label>
                </div>
              </div>

              {createTableMutation.isError && (
                <div className="alert-error">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium">Failed to create table</p>
                    <p className="text-sm opacity-80 mt-0.5">{(createTableMutation.error as Error)?.message || 'Please check your table definition'}</p>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTable(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending || !newTableName || columns.every((c) => !c.name.trim())}
                  className="btn-primary"
                >
                  {createTableMutation.isPending ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Creating...
                    </>
                  ) : (
                    'Create Table'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
