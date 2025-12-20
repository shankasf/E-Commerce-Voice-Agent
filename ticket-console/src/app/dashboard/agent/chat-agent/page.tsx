'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ChatAgentWindowWithMemory } from '@/components/ChatAgentWindowWithMemory';

export default function ChatAgentPage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/tms';
    } else if (!isLoading && user?.role !== 'agent') {
      window.location.href = `/tms/dashboard/${user?.role}`;
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-green-600 text-white shrink-0">
        <div className="px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-green-200 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <h1 className="text-xl font-bold">AI Agent Assistant</h1>
          <p className="text-sm text-green-200 mt-1">
            I'm a powerful computer and server diagnoser. Provide a ticket ID to get started.
          </p>
        </div>
      </header>

      {/* Chat Content - Full width to allow sidebar on left */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatAgentWindowWithMemory isWidget={false} />
      </div>
    </div>
  );
}

