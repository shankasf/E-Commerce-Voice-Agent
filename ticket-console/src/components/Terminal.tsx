'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Play, Square, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'prompt';
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  ticketId: number;
  userId: number;
  userRole: 'requester' | 'agent' | 'admin';
  isMinimized?: boolean;
  onMinimize?: (minimized: boolean) => void;
  messages?: Array<{ content: string; message_id: number }>; // For detecting AI commands
}

const WS_BRIDGE_URL = 'ws://localhost:8080';

export function Terminal({ ticketId, userId, userRole, isMinimized = false, onMinimize, messages = [] }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const executedCommandsRef = useRef<Set<number>>(new Set());
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const executionRef = useRef<{ abort?: () => void }>({});

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (terminalRef.current && !isMinimized) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, isMinimized]);

  // Focus input when terminal is opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    const line: TerminalLine = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    };
    setLines(prev => [...prev, line]);
  }, []);

  // Connect to local terminal bridge
  useEffect(() => {
    if (!isOpen) return;

    setIsConnecting(true);
    const ws = new WebSocket(WS_BRIDGE_URL);

    ws.onopen = () => {
      console.log('[Terminal] Connected to local bridge');
      setIsConnected(true);
      setIsConnecting(false);
      const line: TerminalLine = {
        id: 'connected',
        type: 'output',
        content: 'Connected to local terminal bridge. Ready for commands.',
        timestamp: new Date(),
      };
      setLines(prev => [...prev, line]);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Terminal] Received:', message.type);

        switch (message.type) {
          case 'ready':
            setIsConnected(true);
            setIsConnecting(false);
            const readyLine: TerminalLine = {
              id: 'ready',
              type: 'output',
              content: message.message || 'Terminal bridge connected. Ready to execute commands.',
              timestamp: new Date(),
            };
            setLines(prev => [...prev, readyLine]);
            break;
          case 'output':
            if (message.data) {
              const outputLine: TerminalLine = {
                id: `out-${Date.now()}-${Math.random()}`,
                type: 'output',
                content: message.data,
                timestamp: new Date(),
              };
              setLines(prev => [...prev, outputLine]);
            }
            break;
          case 'error':
            const errorLine: TerminalLine = {
              id: `err-${Date.now()}-${Math.random()}`,
              type: 'error',
              content: `ERROR: ${message.error || message.data || 'Unknown error'}`,
              timestamp: new Date(),
            };
            setLines(prev => [...prev, errorLine]);
            setIsExecuting(false);
            break;
          case 'exit':
            setIsExecuting(false);
            if (message.code !== 0) {
              const exitLine: TerminalLine = {
                id: `exit-${Date.now()}`,
                type: 'error',
                content: `Command exited with code ${message.code}`,
                timestamp: new Date(),
              };
              setLines(prev => [...prev, exitLine]);
            }
            break;
          case 'cancelled':
            const cancelLine: TerminalLine = {
              id: `cancel-${Date.now()}`,
              type: 'output',
              content: 'Command execution cancelled.',
              timestamp: new Date(),
            };
            setLines(prev => [...prev, cancelLine]);
            setIsExecuting(false);
            break;
          case 'pong':
            // Keep-alive response
            break;
        }
      } catch (error) {
        console.error('[Terminal] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Terminal] WebSocket error:', error);
      setIsConnecting(false);
      if (!isConnected) {
        setIsConnected(false);
        const errorLine: TerminalLine = {
          id: 'connection-error',
          type: 'error',
          content: 'Failed to connect to local terminal bridge. Make sure local-terminal-bridge.js is running. Run: node local-terminal-bridge.js',
          timestamp: new Date(),
        };
        setLines(prev => [...prev, errorLine]);
      }
    };

    ws.onclose = () => {
      console.log('[Terminal] Disconnected from local bridge');
      setIsConnected(false);
      setIsExecuting(false);
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (isOpen) {
          console.log('[Terminal] Attempting to reconnect...');
          setIsConnecting(true);
          // Reconnect by triggering effect
        }
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isOpen, isConnected]);

  // Detect and auto-execute AI commands from messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !isConnected) return;
    
    messages.forEach((msg) => {
      // Skip if we already executed this command
      if (executedCommandsRef.current.has(msg.message_id)) return;
      
      // Check for TERMINAL_COMMAND marker
      const commandMatch = msg.content.match(/<TERMINAL_COMMAND>(.+?)<\/TERMINAL_COMMAND>/);
      if (commandMatch) {
        const command = commandMatch[1].trim();
        console.log('[Terminal] Auto-executing AI command:', command);
        executedCommandsRef.current.add(msg.message_id);
        
        // Auto-execute for agent/admin, require approval for requester
        if (userRole === 'requester') {
          setPendingCommand(command);
          setIsApproving(true);
        } else {
          executeCommandDirect(command, true);
        }
      }
    });
  }, [messages, isConnected, userRole]);

  // Initial welcome message and auto-open
  useEffect(() => {
    if (lines.length === 0) {
      const welcomeLine: TerminalLine = {
        id: 'welcome',
        type: 'output',
        content: 'Connecting to local terminal bridge... Make sure to run: npm run terminal-bridge',
        timestamp: new Date(),
      };
      setLines([welcomeLine]);
    }
    // Auto-open terminal when component mounts
    if (!isOpen) {
      setIsOpen(true);
    }
  }, []);

  const executeCommandDirect = (command: string, skipApproval: boolean = false) => {
    if (!command.trim()) return;

    // Check if connected
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const errorLine: TerminalLine = {
        id: `not-connected-${Date.now()}`,
        type: 'error',
        content: 'Not connected to local terminal bridge. Please start local-terminal-bridge.js first. Run: npm run terminal-bridge',
        timestamp: new Date(),
      };
      setLines(prev => [...prev, errorLine]);
      return;
    }

    // Add command to terminal
    const commandLine: TerminalLine = {
      id: `cmd-${Date.now()}`,
      type: 'input',
      content: `$ ${command}`,
      timestamp: new Date(),
    };
    setLines(prev => [...prev, commandLine]);
    setIsExecuting(true);

    // Store cancel function
    executionRef.current.abort = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'cancel' }));
      }
    };

    // Send command to local bridge
    try {
      wsRef.current.send(JSON.stringify({
        type: 'execute',
        command,
        ticketId,
        userId,
        userRole,
      }));
    } catch (error: any) {
      const errorLine: TerminalLine = {
        id: `send-error-${Date.now()}`,
        type: 'error',
        content: `ERROR: ${error.message || 'Failed to send command'}`,
        timestamp: new Date(),
      };
      setLines(prev => [...prev, errorLine]);
      setIsExecuting(false);
      setIsApproving(false);
      setPendingCommand(null);
    }
  };

  const executeCommand = (command: string, approved: boolean = false) => {
    if (!command.trim()) return;

    // For requester role, always require approval (unless already approved)
    if (userRole === 'requester' && !approved) {
      setPendingCommand(command);
      setIsApproving(true);
      return;
    }

    executeCommandDirect(command, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && !isExecuting) {
      const cmd = currentCommand.trim();
      setCurrentCommand(''); // Clear input before executing
      executeCommand(cmd);
    }
  };

  const handleApprove = () => {
    if (pendingCommand) {
      setCurrentCommand(''); // Clear input if there was a manual command
      executeCommandDirect(pendingCommand, true);
      setIsApproving(false);
      setPendingCommand(null);
    }
  };

  const handleReject = () => {
    setIsApproving(false);
    setPendingCommand(null);
    const rejectLine: TerminalLine = {
      id: `reject-${Date.now()}`,
      type: 'output',
      content: 'Command execution cancelled by user.',
      timestamp: new Date(),
    };
    setLines(prev => [...prev, rejectLine]);
  };

  const handleCancel = () => {
    if (executionRef.current.abort) {
      executionRef.current.abort();
    }
    executionRef.current.abort = undefined;
  };

  const clearTerminal = () => {
    setLines([{
      id: 'cleared',
      type: 'output',
      content: 'Terminal cleared.',
      timestamp: new Date(),
    }]);
  };

  if (!isOpen && !isMinimized) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white transition-colors font-medium"
        style={{ borderRadius: 0 }}
      >
        <TerminalIcon className="w-4 h-4" />
        Open Terminal
      </button>
    );
  }

  return (
    <div className={`bg-slate-900 overflow-hidden transition-all flex flex-col ${
      isMinimized ? 'h-12' : 'h-full'
    }`} style={{ minHeight: isMinimized ? '48px' : '100%', height: isMinimized ? '48px' : '100%', maxHeight: '100%' }}>
      {/* Terminal Header removed - now handled by parent wrapper */}

      {!isMinimized && (
        <>
          {/* Terminal Output */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm text-slate-200 space-y-1"
            style={{ backgroundColor: '#0f172a', borderRadius: 0 }}
          >
            {lines.map((line) => {
              const getLineColor = () => {
                switch (line.type) {
                  case 'input':
                    return 'text-blue-400';
                  case 'error':
                    return 'text-red-400';
                  case 'output':
                    return 'text-slate-300';
                  default:
                    return 'text-slate-400';
                }
              };

              return (
                <div key={line.id} className={`${getLineColor()} whitespace-pre-wrap break-words`}>
                  {line.content}
                </div>
              );
            })}
            {isExecuting && (
              <div className="text-yellow-400 animate-pulse">▋</div>
            )}
          </div>

          {/* Command Approval Modal (for requester) */}
          {isApproving && pendingCommand && (
            <div className="bg-yellow-900/50 border-t border-yellow-600 px-4 py-3 flex items-center justify-between" style={{ borderRadius: 0 }}>
              <div className="flex-1">
                <p className="text-yellow-200 text-sm font-semibold mb-1">Approve Command Execution?</p>
                <p className="text-yellow-300/80 text-xs font-mono">{pendingCommand}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Terminal Input */}
          <div className="bg-slate-800 border-t border-slate-700 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-900 px-3 py-2 border border-slate-700" style={{ borderRadius: 0 }}>
                <span className="text-green-400 font-mono text-sm">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  disabled={isExecuting || isApproving}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent text-slate-200 outline-none font-mono text-sm placeholder-slate-500"
                  style={{ borderRadius: 0 }}
                />
              </div>
              {isExecuting ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center gap-2"
                  style={{ borderRadius: 0 }}
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!currentCommand.trim() || isApproving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors flex items-center gap-2"
                  style={{ borderRadius: 0 }}
                >
                  <Play className="w-4 h-4" />
                  Execute
                </button>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}

