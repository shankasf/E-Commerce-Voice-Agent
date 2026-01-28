'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DeviceChatMessage,
  CommandExecution,
  WebSocketMessage,
  WebSocketAuthMessage,
} from '@/types/deviceChat';
import { X, Terminal, Eye } from 'lucide-react';

interface DeviceChatPanelProps {
  ticketId: number;
  agentId: number;
  chatSessionId: string;
  onClose: () => void;
}

export default function DeviceChatPanel({
  ticketId,
  agentId,
  chatSessionId,
  onClose,
}: DeviceChatPanelProps) {
  const [chatMessages, setChatMessages] = useState<DeviceChatMessage[]>([]);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOTE: View-only mode - technician cannot send messages or execute commands
  // These features will be added in a future branch

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_AI_SERVICE_WS_URL || 'localhost:8080';
    return `${wsProtocol}//${wsHost}/ws/technician`;
  };

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log('[DeviceChat] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[DeviceChat] WebSocket connected');

        // Get JWT token from localStorage (you may need to implement JWT storage)
        const jwtToken = localStorage.getItem('jwt_token') || 'temp_token_' + Date.now();

        // Send authentication message
        const authMessage: WebSocketAuthMessage = {
          type: 'auth',
          jwt_token: jwtToken,
          ticket_id: ticketId,
          agent_id: agentId,
        };

        ws.send(JSON.stringify(authMessage));
        console.log('[DeviceChat] Sent auth message');
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('[DeviceChat] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[DeviceChat] WebSocket error:', error);
        setError('Connection error occurred');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[DeviceChat] WebSocket closed');
        setIsConnected(false);

        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[DeviceChat] Error connecting:', err);
      setError('Failed to connect to device chat');
    }
  }, [ticketId, agentId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: WebSocketMessage) => {
    console.log('[DeviceChat] Received message:', data.type);

    switch (data.type) {
      case 'auth_success':
        setIsConnected(true);
        setError(null);
        console.log('[DeviceChat] Authenticated successfully (view-only mode)');

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
        break;

      case 'initial_state':
        console.log(
          `[DeviceChat] Loaded ${data.chat_history.length} messages, ${data.execution_history.length} commands`
        );
        setChatMessages(data.chat_history);
        setExecutions(data.execution_history);
        break;

      case 'chat':
        setChatMessages((prev) => [
          ...prev,
          {
            message_id: crypto.randomUUID(),
            chat_session_id: chatSessionId,
            ticket_id: ticketId,
            device_id: 0,
            sender_type: data.role,
            sender_agent_id: data.metadata?.agent_id,
            content: data.content,
            message_time: data.timestamp,
            metadata: data.metadata,
          },
        ]);
        break;

      case 'command_update':
        setExecutions((prev) => {
          const index = prev.findIndex((e) => e.command_id === data.command_id);
          if (index >= 0) {
            // Update existing command
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: data.status as any,
              output: data.output || updated[index].output,
              error: data.error || updated[index].error,
              execution_time_ms: data.execution_time_ms || updated[index].execution_time_ms,
            };
            return updated;
          } else if (data.command && data.status) {
            // Add new command if it includes command text (new command initiated)
            return [
              ...prev,
              {
                execution_id: crypto.randomUUID(),
                chat_session_id: chatSessionId,
                ticket_id: ticketId,
                device_id: 0,
                command_id: data.command_id,
                command: data.command,
                description: data.description || '',
                requester_type: data.requester_type || 'ai_agent',
                requester_agent_id: null,
                status: data.status as any,
                output: data.output || null,
                error: data.error || null,
                execution_time_ms: data.execution_time_ms || null,
                created_at: new Date().toISOString(),
                completed_at: null,
              },
            ];
          }
          return prev;
        });
        break;

      case 'command_result':
        // View-only: just update the execution display
        setExecutions((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((e) => e.command_id === data.command_id);
          if (index >= 0) {
            updated[index] = {
              ...updated[index],
              status: data.status as any,
              output: data.output || null,
              error: data.error || null,
              completed_at: new Date().toISOString(),
            };
          }
          return updated;
        });
        break;

      case 'error':
        console.error('[DeviceChat] Server error:', data.error);
        setError(data.error);
        if (data.error.includes('not assigned') || data.error.includes('not found')) {
          setIsConnected(false);
        }
        break;

      case 'heartbeat_ack':
        // Connection is alive
        break;
    }
  };

  // NOTE: sendMessage and executeCommand functions removed for view-only mode
  // These features will be added in a future branch

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executions]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get sender display name
  const getSenderName = (msg: DeviceChatMessage) => {
    switch (msg.sender_type) {
      case 'user':
        return 'Customer';
      case 'ai_agent':
        return 'AI Assistant';
      case 'human_agent':
        return msg.metadata?.agent_name || 'Technician';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  // Get message background color
  const getMessageBgColor = (msg: DeviceChatMessage) => {
    if (msg.sender_type === 'human_agent' && msg.sender_agent_id === agentId) {
      return 'bg-green-100';
    }

    switch (msg.sender_type) {
      case 'user':
        return 'bg-blue-100';
      case 'ai_agent':
        return 'bg-purple-100';
      case 'human_agent':
        return 'bg-green-100';
      case 'system':
        return 'bg-gray-100';
      default:
        return 'bg-gray-50';
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-700';
      case 'error':
        return 'bg-red-700';
      case 'running':
        return 'bg-blue-700';
      case 'pending':
        return 'bg-gray-700';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold">Device Chat</span>
          <span
            className={`px-2 py-1 text-xs rounded ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isConnected && (
            <span className="text-xs text-blue-600 font-medium">(View Only)</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Close device chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Split Panes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel (Left) */}
        <div className="flex-1 flex flex-col border-r">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No messages yet
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender_type === 'human_agent' && msg.sender_agent_id === agentId
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div className={`max-w-[80%] px-4 py-2 rounded-lg ${getMessageBgColor(msg)}`}>
                  <div className="text-xs text-gray-600 font-medium mb-1">
                    {getSenderName(msg)}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTime(msg.message_time)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* View-Only Notice */}
          <div className="p-3 bg-blue-50 border-t text-center text-sm text-blue-700 shrink-0">
            <Eye className="w-4 h-4 inline mr-1" />
            View-only mode — Sending messages will be available in a future update
          </div>
        </div>

        {/* Terminal Panel (Right) */}
        <div className="w-1/2 flex flex-col bg-gray-900 text-white">
          {/* Execution History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
            {executions.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No commands executed yet
              </div>
            )}

            {executions.map((exec, idx) => (
              <div key={idx} className="bg-gray-800 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 break-all">$ {exec.command}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${getStatusColor(exec.status)} ml-2`}
                  >
                    {exec.status.toUpperCase()}
                  </span>
                </div>
                {exec.description && (
                  <div className="text-xs text-gray-400 mb-2">{exec.description}</div>
                )}
                {exec.output && (
                  <div className="mt-2 text-gray-300 whitespace-pre-wrap break-words">
                    {exec.output}
                  </div>
                )}
                {exec.error && (
                  <div className="mt-2 text-red-400 whitespace-pre-wrap break-words">
                    {exec.error}
                  </div>
                )}
                {exec.execution_time_ms && (
                  <div className="text-xs text-gray-500 mt-2">
                    Execution time: {exec.execution_time_ms}ms
                  </div>
                )}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* View-Only Notice */}
          <div className="p-3 bg-gray-800 border-t border-gray-700 text-center text-sm text-gray-400 shrink-0">
            View-only mode — Command execution will be available in a future update
          </div>
        </div>
      </div>
    </div>
  );
}
