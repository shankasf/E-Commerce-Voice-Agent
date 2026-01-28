import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databaseApi } from '../services/api';

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const StorageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbOwner, setNewDbOwner] = useState('');
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['databases'],
    queryFn: databaseApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () => databaseApi.create(newDbName, newDbOwner || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setShowCreateModal(false);
      setNewDbName('');
      setNewDbOwner('');
    },
  });

  const databases = response?.data || [];
  const totalSize = databases.reduce((sum, db) => sum + (db.size_bytes || 0), 0);
  const activeCount = databases.filter(db => db.datallowconn).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-text-muted text-sm">Loading databases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Databases</h1>
          <p className="page-subtitle">
            Manage your PostgreSQL database instances
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon />
          New Database
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Total Databases</p>
              <p className="text-3xl font-bold mt-1">{databases.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <DatabaseIcon />
            </div>
          </div>
        </div>
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Active</p>
              <p className="text-3xl font-bold mt-1 text-success">{activeCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card-stats">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium uppercase tracking-wider">Total Size</p>
              <p className="text-3xl font-bold mt-1">{formatBytes(totalSize)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <StorageIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Database Grid */}
      {databases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db, index) => (
            <Link
              key={db.datname}
              to={`/db/${db.datname}`}
              className="panel-interactive p-5 group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:from-primary group-hover:to-primary-hover group-hover:text-bg transition-all">
                  <DatabaseIcon />
                </div>
                <div className="flex items-center gap-2">
                  {db.datallowconn ? (
                    <span className="badge-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="badge-danger">
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {db.datname}
              </h3>

              <div className="mt-3 pt-3 border-t border-panel-border space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <StorageIcon />
                  <span>{formatBytes(db.size_bytes)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <UserIcon />
                  <span>Owner: {db.owner}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open database</span>
                <ArrowRightIcon />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state panel">
          <div className="w-16 h-16 rounded-xl bg-panel-hover flex items-center justify-center text-text-dim mb-4">
            <DatabaseIcon />
          </div>
          <h3 className="empty-state-title">No databases found</h3>
          <p className="empty-state-description">
            Get started by creating your first database to manage your data.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary mt-6"
          >
            <PlusIcon />
            Create Database
          </button>
        </div>
      )}

      {/* Create Database Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="modal-header mb-0">Create Database</h2>
                <p className="text-text-muted text-sm mt-1">Add a new PostgreSQL database</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-5"
            >
              <div>
                <label className="label">Database Name</label>
                <input
                  type="text"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="input"
                  placeholder="my_database"
                  required
                  autoFocus
                  pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                  title="Database name must start with a letter or underscore and contain only letters, numbers, and underscores"
                />
                <p className="text-2xs text-text-dim mt-1.5">
                  Use lowercase letters, numbers, and underscores
                </p>
              </div>

              <div>
                <label className="label">Owner (optional)</label>
                <input
                  type="text"
                  value={newDbOwner}
                  onChange={(e) => setNewDbOwner(e.target.value)}
                  className="input"
                  placeholder="postgres"
                />
                <p className="text-2xs text-text-dim mt-1.5">
                  Leave empty to use current user as owner
                </p>
              </div>

              {createMutation.isError && (
                <div className="alert-error">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium">Failed to create database</p>
                    <p className="text-sm opacity-80 mt-0.5">Please check the name and try again</p>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newDbName}
                  className="btn-primary"
                >
                  {createMutation.isPending ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Creating...
                    </>
                  ) : (
                    'Create Database'
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
