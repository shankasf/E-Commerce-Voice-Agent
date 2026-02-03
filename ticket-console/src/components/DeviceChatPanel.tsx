'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DeviceChatMessage,
  CommandExecution,
  WebSocketMessage,
  WebSocketAuthMessage,
  IssueSummary,
} from '@/types/deviceChat';
import {
  Terminal,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Building2,
  Monitor,
  Send,
  Play,
  Cpu,
  Network,
  HardDrive,
} from 'lucide-react';

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
  const [issueSummary, setIssueSummary] = useState<IssueSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isPrimaryAssignee, setIsPrimaryAssignee] = useState(false);

  // Input state
  const [messageInput, setMessageInput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [commandDescription, setCommandDescription] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [askAI, setAskAI] = useState(false); // Toggle for AI involvement in chat

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
        const jwtToken = localStorage.getItem('jwt_token') || 'temp_token_' + Date.now();

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
        setIsPrimaryAssignee(data.is_primary_assignee || false);
        console.log(`[DeviceChat] Authenticated successfully (primary=${data.is_primary_assignee})`);

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
        if (data.issue_summary) {
          console.log('[DeviceChat] Loaded issue summary');
          setIssueSummary(data.issue_summary);
        }
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
        break;
    }
  };

  // Send chat message
  const sendChatMessage = useCallback(() => {
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Only primary assignee can ask AI for help
    const includeAI = askAI && isPrimaryAssignee;

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      content: messageInput.trim(),
      ask_ai: includeAI
    }));

    setMessageInput('');
  }, [messageInput, askAI, isPrimaryAssignee]);

  // Execute command (primary assignee only)
  const executeCommand = useCallback(() => {
    if (!commandInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!isPrimaryAssignee) {
      setError('Only primary assignee can execute commands');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'execute_command',
      command: commandInput.trim(),
      description: commandDescription.trim() || undefined
    }));

    setCommandInput('');
    setCommandDescription('');
  }, [commandInput, commandDescription, isPrimaryAssignee]);

  // Send AI instruction (primary assignee only)
  const sendAIInstruction = useCallback((instruction: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!isPrimaryAssignee) {
      setError('Only primary assignee can guide AI');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'ai_instruction',
      instruction: instruction
    }));
  }, [isPrimaryAssignee]);

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

  // Get sender display info
  const getSenderInfo = (msg: DeviceChatMessage) => {
    switch (msg.sender_type) {
      case 'user':
        return { name: 'Customer', icon: User, color: 'text-blue-400' };
      case 'ai_agent':
        return { name: 'AI Assistant', icon: Bot, color: 'text-emerald-400' };
      case 'human_agent':
        return {
          name: msg.metadata?.agent_name || 'Technician',
          icon: Wrench,
          color: 'text-cyan-400',
        };
      case 'system':
        return { name: 'System', icon: AlertCircle, color: 'text-orange-400' };
      default:
        return { name: 'Unknown', icon: User, color: 'text-gray-400' };
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: CheckCircle2, bg: 'bg-green-900/50', text: 'text-green-400', label: 'SUCCESS' };
      case 'error':
        return { icon: XCircle, bg: 'bg-red-900/50', text: 'text-red-400', label: 'ERROR' };
      case 'running':
        return { icon: Clock, bg: 'bg-blue-900/50', text: 'text-blue-400', label: 'RUNNING' };
      case 'pending':
        return { icon: Clock, bg: 'bg-gray-700', text: 'text-gray-400', label: 'PENDING' };
      default:
        return { icon: Clock, bg: 'bg-gray-700', text: 'text-gray-400', label: status.toUpperCase() };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-[#cccccc]" />
          <span className="text-sm font-semibold text-[#cccccc]">Device Chat Session</span>
          <span className="text-xs text-[#858585]">Ticket #{ticketId}</span>
          <span
            className={`px-2 py-1 text-xs rounded ${
              isConnected
                ? 'bg-[#0e639c] text-white'
                : 'bg-[#5f2d2d] text-[#f48771]'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isConnected && (
            <span className={`flex items-center gap-1 text-xs ${isPrimaryAssignee ? 'text-[#4ec9b0]' : 'text-[#858585]'}`}>
              {isPrimaryAssignee ? (
                <>
                  <Wrench className="w-3 h-3" />
                  Primary Assignee
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  View + Chat
                </>
              )}
            </span>
          )}
          {/* Issue Summary Button */}
          {issueSummary && (
            <button
              onClick={() => setShowSummary(!showSummary)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
                showSummary
                  ? 'bg-[#0e639c] text-white'
                  : 'bg-[#3c3c3c] hover:bg-[#4d4d4d] text-[#cccccc]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Issue Summary
              {showSummary ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm bg-[#3c3c3c] hover:bg-[#4d4d4d] text-[#cccccc] rounded transition-colors"
        >
          Close
        </button>
      </div>

      {/* Issue Summary Panel (Expandable) */}
      {showSummary && issueSummary && (
        <div className="bg-[#252526] border-b border-[#3c3c3c] overflow-y-auto max-h-[50vh]">
          <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#cccccc] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#569cd6]" />
                Issue Summary
                {issueSummary.ticket_priority && (
                  <span className="px-2 py-0.5 text-xs rounded bg-[#5f4d2d] text-[#dcdcaa]">
                    {issueSummary.ticket_priority}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowSummary(false)}
                className="text-xs text-[#858585] hover:text-[#cccccc]"
              >
                Collapse
              </button>
            </div>

            {/* Customer & Device Info */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#569cd6]" />
                <span className="text-[#858585]">Customer:</span>
                <span className="text-[#cccccc]">{issueSummary.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#569cd6]" />
                <span className="text-[#858585]">Organization:</span>
                <span className="text-[#cccccc]">{issueSummary.organization_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#569cd6]" />
                <span className="text-[#858585]">Device:</span>
                <span className="text-[#cccccc]">{issueSummary.device_info}</span>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Problem Reported */}
              <div className="bg-[#1e1e1e] rounded-lg p-4">
                <div className="text-xs text-[#858585] mb-2 font-semibold">Problem Reported</div>
                <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap">
                  {issueSummary.issue_description || 'No description available'}
                </div>
              </div>

              {/* Right Column - Technician Handoff Summary */}
              <div className="bg-[#2d2d1e] rounded-lg p-4 border border-[#5f5f2d]">
                <div className="text-xs text-[#dcdcaa] mb-2 font-semibold flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Technician Handoff Summary
                </div>
                {issueSummary.ai_diagnosis ? (
                  <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">
                    {issueSummary.ai_diagnosis
                      .replace(/\*\*(.+?)\*\*/g, '$1')
                      .replace(/^- /gm, '• ')
                    }
                  </div>
                ) : (
                  <div className="text-sm text-[#858585] italic">Generating summary...</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#5f2d2d] text-[#f48771] text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Chat */}
        <div className="flex-1 flex flex-col min-w-[300px] bg-[#1e1e1e]">
          {/* Chat Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#858585]" />
              <span className="text-xs font-semibold text-[#858585] tracking-wide">CHAT</span>
            </div>
            <span className="text-xs text-[#4d4d4d]">{chatMessages.length} messages</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[#4d4d4d]">
                <MessageSquare className="w-8 h-8 mb-2" />
                <span className="text-sm">No messages yet</span>
              </div>
            )}

            {chatMessages.map((msg, idx) => {
              const sender = getSenderInfo(msg);
              const Icon = sender.icon;

              return (
                <div key={idx} className="group">
                  {msg.sender_type === 'system' ? (
                    // System message - centered
                    <div className="flex justify-center">
                      <div className="bg-[#3e3e42] rounded px-4 py-2 max-w-[80%]">
                        <span className="text-xs text-[#ce9178] italic">{msg.content}</span>
                      </div>
                    </div>
                  ) : msg.sender_type === 'user' ? (
                    // User message - dark background
                    <div className="bg-[#2d2d30] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${sender.color}`} />
                        <span className={`text-xs font-semibold ${sender.color}`}>{sender.name}</span>
                        <span className="text-xs text-[#4d4d4d]">{formatTime(msg.message_time)}</span>
                      </div>
                      <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ) : (
                    // AI/Agent message - transparent background
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${sender.color}`} />
                        <span className={`text-xs font-semibold ${sender.color}`}>{sender.name}</span>
                        <span className="text-xs text-[#4d4d4d]">{formatTime(msg.message_time)}</span>
                      </div>
                      <div className="text-sm text-[#d4d4d4] whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-4 py-3 bg-[#252526] border-t border-[#3c3c3c]">
            {/* Ask AI Toggle (Primary Assignee Only) */}
            {isPrimaryAssignee && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setAskAI(!askAI)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    askAI
                      ? 'bg-[#4ec9b0] text-[#1e1e1e]'
                      : 'bg-[#3c3c3c] text-[#858585] hover:bg-[#4d4d4d]'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  {askAI ? 'AI will respond' : 'Ask AI'}
                </button>
                {askAI && (
                  <span className="text-xs text-[#4ec9b0]">
                    AI will analyze and respond to help resolve the issue
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder={askAI ? "Ask AI for help with the issue..." : "Type a message to the customer..."}
                className={`flex-1 px-3 py-2 rounded text-sm placeholder-[#858585] focus:outline-none focus:ring-1 ${
                  askAI
                    ? 'bg-[#1a2a1a] text-[#cccccc] focus:ring-[#4ec9b0] border border-[#2d4d2d]'
                    : 'bg-[#3c3c3c] text-[#cccccc] focus:ring-[#0e639c]'
                }`}
                disabled={!isConnected}
              />
              <button
                onClick={sendChatMessage}
                disabled={!isConnected || !messageInput.trim()}
                className={`px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                  askAI
                    ? 'bg-[#4ec9b0] hover:bg-[#5fd9c0] disabled:bg-[#2d2d2d] disabled:text-[#4d4d4d] text-[#1e1e1e]'
                    : 'bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#858585] text-white'
                }`}
              >
                {askAI ? <Bot className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {askAI ? 'Ask AI' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-1 bg-[#3c3c3c] cursor-col-resize hover:bg-[#0e639c] transition-colors" />

        {/* RIGHT PANE: Execution */}
        <div className="flex-1 flex flex-col min-w-[300px] bg-[#0d0d0d]">
          {/* Execution Pane Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2d2d2d]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#858585]" />
              <span className="text-xs font-semibold text-[#858585] tracking-wide">EXECUTION</span>
            </div>
            {executions.some((e) => e.status === 'running') && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#4ec9b0] animate-pulse" />
                <span className="text-xs text-[#4ec9b0]">Running...</span>
              </div>
            )}
          </div>

          {/* Execution Output */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {executions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[#4d4d4d]">
                <Terminal className="w-8 h-8 mb-2" />
                <span className="text-sm">No commands executed yet</span>
                <span className="text-xs text-[#3c3c3c] mt-1">
                  AI will execute commands here when needed
                </span>
              </div>
            )}

            {executions.map((exec, idx) => {
              const status = getStatusInfo(exec.status);

              return (
                <div key={idx} className="mb-6">
                  {/* Command Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#6a9955]">$</span>
                    <span className="text-[#dcdcaa] font-semibold break-all">{exec.command}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Description */}
                  {exec.description && (
                    <div className="ml-4 mb-2 text-xs text-[#858585]">{exec.description}</div>
                  )}

                  {/* Output */}
                  {exec.output && (
                    <div className="ml-4 bg-[#111111] rounded p-3 text-[#d4d4d4] whitespace-pre-wrap break-words">
                      {exec.output}
                    </div>
                  )}

                  {/* Error */}
                  {exec.error && (
                    <div className="ml-4 mt-2 bg-[#2d1515] rounded p-3 text-[#f48771] whitespace-pre-wrap break-words">
                      {exec.error}
                    </div>
                  )}

                  {/* Execution Time */}
                  {exec.execution_time_ms && (
                    <div className="ml-4 mt-2 text-xs text-[#4d4d4d]">
                      Completed in {exec.execution_time_ms}ms
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* AI Collaboration Panel (Primary Assignee Only) */}
          {isPrimaryAssignee && (
            <div className="px-4 py-2 bg-[#1a2a1a] border-t border-[#2d4d2d]">
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-2 text-xs text-[#4ec9b0] hover:text-[#5fd9c0] transition-colors w-full"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="font-semibold">AI Collaboration</span>
                {showAIPanel ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronUp className="w-3.5 h-3.5 ml-auto" />}
              </button>
              {showAIPanel && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => sendAIInstruction('Run comprehensive network diagnostics and report any connectivity issues')}
                    disabled={!isConnected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-50
                               text-[#cccccc] rounded text-xs transition-colors"
                  >
                    <Network className="w-3 h-3" />
                    Network Diagnostics
                  </button>
                  <button
                    onClick={() => sendAIInstruction('Check system performance including CPU, memory, and disk usage')}
                    disabled={!isConnected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-50
                               text-[#cccccc] rounded text-xs transition-colors"
                  >
                    <Cpu className="w-3 h-3" />
                    System Performance
                  </button>
                  <button
                    onClick={() => sendAIInstruction('Check disk health and storage usage across all drives')}
                    disabled={!isConnected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-50
                               text-[#cccccc] rounded text-xs transition-colors"
                  >
                    <HardDrive className="w-3 h-3" />
                    Disk Health
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Command Input (Primary Assignee) or View-Only Notice */}
          <div className="px-4 py-3 bg-[#1a1a1a] border-t border-[#2d2d2d]">
            {isPrimaryAssignee ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && executeCommand()}
                    placeholder="Enter PowerShell command..."
                    className="flex-1 px-3 py-2 bg-[#2d2d2d] text-[#dcdcaa] rounded text-sm
                               font-mono placeholder-[#4d4d4d] focus:outline-none focus:ring-1 focus:ring-[#4ec9b0]"
                    disabled={!isConnected}
                  />
                  <button
                    onClick={executeCommand}
                    disabled={!isConnected || !commandInput.trim()}
                    className="px-4 py-2 bg-[#4ec9b0] hover:bg-[#5fd9c0] disabled:bg-[#2d2d2d]
                               disabled:text-[#4d4d4d] text-[#1e1e1e] rounded text-sm font-semibold
                               transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Execute
                  </button>
                </div>
                <input
                  type="text"
                  value={commandDescription}
                  onChange={(e) => setCommandDescription(e.target.value)}
                  placeholder="Description (optional) — shown to user for consent"
                  className="w-full px-3 py-1.5 bg-[#2d2d2d] text-[#858585] rounded text-xs
                             placeholder-[#4d4d4d] focus:outline-none"
                  disabled={!isConnected}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-[#4d4d4d]">
                <Eye className="w-4 h-4" />
                Command execution requires primary assignee role
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
