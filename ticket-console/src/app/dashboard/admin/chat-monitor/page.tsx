'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { chatService, LiveSession } from '@/lib/services/chatService';
import {
  MessageSquare,
  Users,
  Clock,
  RefreshCw,
  LogOut,
  ChevronLeft,
  Bot,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatMonitorPage() {
  const { user, logout, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      window.location.href = '/';
    } else if (mounted && !isLoading && user?.role !== 'admin') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading, mounted]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await chatService.getLiveSessions();

      if (result.success) {
        setSessions(result.sessions);
      } else {
        throw new Error(result.error || 'Failed to load sessions');
      }
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Failed to load live sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadSessions();
    }
  }, [user]);

  // Auto-refresh every 5 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || user?.role !== 'admin') return;

    const interval = setInterval(() => {
      loadSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/admin'}
              className="flex items-center gap-2 text-purple-200 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold">Live Chat Monitor</h1>
              <p className="text-sm text-purple-200">Real-time AI chat sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadSessions}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-purple-200 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{sessions.length}</p>
                <p className="text-xs text-gray-500">Active Sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {new Set(sessions.map(s => s.user_id).filter(Boolean)).size}
                </p>
                <p className="text-xs text-gray-500">Unique Users</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {sessions.reduce((acc, s) => acc + s.message_count, 0)}
                </p>
                <p className="text-xs text-gray-500">Total Messages</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Active Chat Sessions</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active chat sessions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-mono text-gray-600">
                          {session.session_id.substring(0, 20)}...
                        </span>
                        {session.user_role && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {session.user_role}
                          </span>
                        )}
                      </div>

                      {session.agent_name && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Agent:</span> {session.agent_name}
                        </p>
                      )}

                      {session.last_message && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          <span className="font-medium">Last message:</span> {session.last_message}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{session.message_count} messages</span>
                        </div>
                        {session.user_id && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>User ID: {session.user_id}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Live Monitoring</h3>
              <p className="text-sm text-blue-700">
                This page displays all active chat sessions in real-time. Sessions are automatically
                removed when they end or timeout. Use the refresh button or enable auto-refresh to
                keep the data current.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
