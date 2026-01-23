'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Terminal } from 'lucide-react';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatSessionProvider, useChatSessionContext } from '@/lib/chat-session-context';

function RequesterChatPageContent() {
  const { user, isLoading } = useAuth();
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { sessionId, startSession, loadSession } = useChatSessionContext();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/dashboard';
    } else if (!isLoading && user?.role !== 'requester') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // Constrain between 30% and 70%
      if (newWidth >= 30 && newWidth <= 70) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleNewChat = async () => {
    await startSession();
  };

  const handleSessionSelect = async (selectedSessionId: string) => {
    await loadSession(selectedSessionId);
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-blue-600 text-white shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-blue-200 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </button>
            {!isTerminalOpen && (
              <button
                onClick={() => setIsTerminalOpen(true)}
                title="Open Terminal"
                className="p-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
              >
                <Terminal className="w-5 h-5" />
              </button>
            )}
          </div>
          <h1 className="text-xl font-bold">AI Assistant</h1>
          <p className="text-sm text-blue-200 mt-1">
            Chat with our AI assistant for help with your support tickets
          </p>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden min-h-0 flex relative"
      >
        {/* Left Sidebar - Chat History */}
        <div className="w-64 shrink-0 bg-gray-900">
          <ChatSidebar
            currentSessionId={sessionId}
            onSessionSelect={handleSessionSelect}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Middle - Chat Window */}
        <div style={{ width: isTerminalOpen ? `${leftWidth}%` : '100%' }} className="border-r border-gray-300 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
        </div>

        {/* Draggable Divider */}
        {isTerminalOpen && (
          <div
            onMouseDown={handleMouseDown}
            className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors shrink-0"
            title="Drag to resize"
          />
        )}

        {/* Right Side - Terminal Window */}
        {isTerminalOpen && (
          <div style={{ width: `${100 - leftWidth}%` }} className="flex flex-col bg-gray-900 text-gray-100">
            {/* Terminal Header */}
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold text-sm">Terminal Output</span>
              </div>
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="w-6 h-6 rounded hover:bg-gray-700 flex items-center justify-center text-xs"
                title="Close Terminal"
              >
                ×
              </button>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm">
              <div className="text-gray-400">
                <p>$ Terminal output will be displayed here</p>
                <p className="mt-4 text-gray-500">Waiting for command execution...</p>
                <div className="mt-8 border-t border-gray-700 pt-4 text-gray-600">
                  <p>[This is a placeholder for terminal output]</p>
                  <p>[Features will be added later]</p>
                </div>
              </div>
            </div>

            {/* Terminal Footer */}
            <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 shrink-0">
              <input
                type="text"
                placeholder="$ Enter command here..."
                disabled
                className="w-full bg-gray-800 text-gray-100 placeholder-gray-600 outline-none text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RequesterChatPage() {
  return (
    <ChatSessionProvider>
      <RequesterChatPageContent />
    </ChatSessionProvider>
  );
}
