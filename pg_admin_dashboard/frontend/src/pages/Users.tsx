import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, databaseApi } from '../services/api';
import type { RoleInfo } from '../types';

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

export function Users() {
  const queryClient = useQueryClient();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    canCreateDb: false,
    canCreateRole: false,
  });

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const { data: dbResponse } = useQuery({
    queryKey: ['databases'],
    queryFn: databaseApi.list,
  });

  const users = (usersResponse?.data || []) as RoleInfo[];
  const databases = dbResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: () => usersApi.create(newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', canCreateDb: false, canCreateRole: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const grantMutation = useMutation({
    mutationFn: ({ username, database }: { username: string; database: string }) =>
      usersApi.grant(username, database),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Users & Roles</h1>
          <p className="text-text-muted text-sm mt-1">
            Manage database roles and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="btn-primary"
        >
          <PlusIcon />
          New User
        </button>
      </div>

      {/* Users Table */}
      <div className="panel">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-secondary">
              <th className="table-header text-left">Username</th>
              <th className="table-header text-left">Permissions</th>
              <th className="table-header text-left">Grant Access</th>
              <th className="table-header w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.rolname} className="hover:bg-panel-hover">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                      <UserIcon />
                    </div>
                    <div>
                      <p className="font-medium">{user.rolname}</p>
                      {user.rolcanlogin && (
                        <p className="text-text-muted text-xs">Can login</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {user.rolsuper && <span className="badge-danger">Superuser</span>}
                    {user.rolcreatedb && <span className="badge-primary">CreateDB</span>}
                    {user.rolcreaterole && <span className="badge-accent">CreateRole</span>}
                    {!user.rolsuper && !user.rolcreatedb && !user.rolcreaterole && (
                      <span className="text-text-muted text-sm">Basic</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <select
                    className="input py-1 text-sm w-40"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        grantMutation.mutate({ username: user.rolname, database: e.target.value });
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Grant to...</option>
                    {databases.map((db) => (
                      <option key={db.datname} value={db.datname}>
                        {db.datname}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => {
                      if (confirm(`Delete user "${user.rolname}"?`)) {
                        deleteMutation.mutate(user.rolname);
                      }
                    }}
                    className="btn-icon text-danger"
                    title="Delete"
                    disabled={user.rolsuper}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-full max-w-md animate-fade-in">
            <h2 className="font-display text-xl font-semibold mb-4">Create User</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="input"
                  placeholder="new_user"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input"
                  placeholder="Minimum 10 characters"
                  minLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newUser.canCreateDb}
                    onChange={(e) => setNewUser({ ...newUser, canCreateDb: e.target.checked })}
                    className="rounded border-panel-border bg-bg"
                  />
                  <span className="text-sm">Can create databases</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newUser.canCreateRole}
                    onChange={(e) => setNewUser({ ...newUser, canCreateRole: e.target.checked })}
                    className="rounded border-panel-border bg-bg"
                  />
                  <span className="text-sm">Can create roles</span>
                </label>
              </div>

              {createMutation.isError && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                  Failed to create user
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newUser.username || !newUser.password}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
