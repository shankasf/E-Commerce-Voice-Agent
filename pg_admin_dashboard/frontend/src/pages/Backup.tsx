import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi, databaseApi } from '../services/api';

// Icons
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const RestoreIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

interface BackupInfo {
  filename: string;
  database: string;
  size: number;
  created: string;
  format: string;
}

export function Backup() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);

  // Form state for creating backup
  const [createForm, setCreateForm] = useState({
    dbName: '',
    format: 'plain' as 'plain' | 'custom' | 'tar',
    schemaOnly: false,
    dataOnly: false,
    compress: false,
  });

  // Form state for restoring
  const [restoreForm, setRestoreForm] = useState({
    dbName: '',
    clean: false,
  });

  const { data: dbResponse } = useQuery({
    queryKey: ['databases'],
    queryFn: databaseApi.list,
  });

  const databases = dbResponse?.data || [];

  const { data: backupsResponse, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: backupApi.listAll,
  });

  const backups = (backupsResponse?.data as BackupInfo[]) || [];

  const createMutation = useMutation({
    mutationFn: () => backupApi.create(createForm.dbName, {
      format: createForm.format,
      schemaOnly: createForm.schemaOnly,
      dataOnly: createForm.dataOnly,
      compress: createForm.compress,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setShowCreateModal(false);
      setCreateForm({ dbName: '', format: 'plain', schemaOnly: false, dataOnly: false, compress: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ dbName, filename }: { dbName: string; filename: string }) =>
      backupApi.delete(dbName, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!selectedBackup) throw new Error('No backup selected');
      return backupApi.restore(restoreForm.dbName, selectedBackup.filename, restoreForm.clean);
    },
    onSuccess: () => {
      setShowRestoreModal(false);
      setSelectedBackup(null);
      setRestoreForm({ dbName: '', clean: false });
    },
  });

  const handleDownload = async (backup: BackupInfo) => {
    try {
      await backupApi.download(backup.database, backup.filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = (backup: BackupInfo) => {
    if (confirm(`Are you sure you want to delete backup "${backup.filename}"?`)) {
      deleteMutation.mutate({ dbName: backup.database, filename: backup.filename });
    }
  };

  const handleRestoreClick = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setRestoreForm({ dbName: backup.database, clean: false });
    setShowRestoreModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Backup & Restore</h1>
          <p className="text-text-muted text-sm mt-1">Manage database backups</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon />
          Create Backup
        </button>
      </div>

      {/* Backups List */}
      <div className="panel">
        <div className="p-4 border-b border-panel-border">
          <h2 className="font-semibold">Available Backups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-panel-border">
                <th className="table-header">Filename</th>
                <th className="table-header">Database</th>
                <th className="table-header">Format</th>
                <th className="table-header">Size</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.filename} className="border-b border-panel-border/50 hover:bg-panel-hover">
                  <td className="table-cell font-mono text-sm">{backup.filename}</td>
                  <td className="table-cell">{backup.database}</td>
                  <td className="table-cell">
                    <span className="badge">{backup.format}</span>
                  </td>
                  <td className="table-cell">{formatBytes(backup.size)}</td>
                  <td className="table-cell text-sm">{formatDate(backup.created)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        className="btn-secondary btn-icon"
                        title="Download"
                      >
                        <DownloadIcon />
                      </button>
                      <button
                        onClick={() => handleRestoreClick(backup)}
                        className="btn-secondary btn-icon"
                        title="Restore"
                      >
                        <RestoreIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(backup)}
                        disabled={deleteMutation.isPending}
                        className="btn-danger btn-icon"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-text-muted py-8">
                    No backups available. Create your first backup to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-display font-bold mb-4">Create Backup</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Database</label>
                <select
                  value={createForm.dbName}
                  onChange={(e) => setCreateForm({ ...createForm, dbName: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select database...</option>
                  {databases.map((db) => (
                    <option key={db.datname} value={db.datname}>
                      {db.datname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Format</label>
                <select
                  value={createForm.format}
                  onChange={(e) => setCreateForm({ ...createForm, format: e.target.value as 'plain' | 'custom' | 'tar' })}
                  className="input"
                >
                  <option value="plain">Plain SQL (.sql)</option>
                  <option value="custom">Custom (.dump)</option>
                  <option value="tar">Tar Archive (.tar)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.schemaOnly}
                    onChange={(e) => setCreateForm({ ...createForm, schemaOnly: e.target.checked, dataOnly: false })}
                    className="rounded border-panel-border bg-bg"
                  />
                  <span className="text-sm">Schema only (no data)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.dataOnly}
                    onChange={(e) => setCreateForm({ ...createForm, dataOnly: e.target.checked, schemaOnly: false })}
                    className="rounded border-panel-border bg-bg"
                  />
                  <span className="text-sm">Data only (no schema)</span>
                </label>

                {createForm.format === 'plain' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.compress}
                      onChange={(e) => setCreateForm({ ...createForm, compress: e.target.checked })}
                      className="rounded border-panel-border bg-bg"
                    />
                    <span className="text-sm">Compress with gzip</span>
                  </label>
                )}
              </div>

              {createMutation.isError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  {(createMutation.error as Error).message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || !createForm.dbName} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Backup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-display font-bold mb-4">Restore Backup</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                restoreMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-panel-hover rounded-md">
                <div className="text-sm text-text-muted mb-1">Backup file:</div>
                <div className="font-mono text-sm">{selectedBackup.filename}</div>
              </div>

              <div>
                <label className="label">Restore to Database</label>
                <select
                  value={restoreForm.dbName}
                  onChange={(e) => setRestoreForm({ ...restoreForm, dbName: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select database...</option>
                  {databases.map((db) => (
                    <option key={db.datname} value={db.datname}>
                      {db.datname}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={restoreForm.clean}
                  onChange={(e) => setRestoreForm({ ...restoreForm, clean: e.target.checked })}
                  className="rounded border-panel-border bg-bg"
                />
                <span className="text-sm">Clean (drop existing objects before restore)</span>
              </label>

              <div className="p-3 bg-warning/10 border border-warning/20 rounded-md text-warning text-sm">
                Warning: This will overwrite data in the target database. Make sure you have a backup.
              </div>

              {restoreMutation.isError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  {(restoreMutation.error as Error).message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRestoreModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={restoreMutation.isPending || !restoreForm.dbName} className="btn-primary">
                  {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
