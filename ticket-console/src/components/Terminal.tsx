'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, X, Square, Wifi, WifiOff } from 'lucide-react';

interface TerminalProps {
  ticketId: number;
  userId: number;
  userRole: 'requester' | 'agent' | 'admin';
  isMinimized?: boolean;
  onMinimize?: (minimized: boolean) => void;
  messages?: Array<{ content: string; message_id: number }>; // For detecting AI commands
}

export function Terminal({ ticketId, userId, userRole, isMinimized = false, onMinimize, messages = [] }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const executedCommandsRef = useRef<Set<number>>(new Set());
  const sessionIdRef = useRef<string>(`${ticketId}-${userId}-${Date.now()}`);
  const currentLineRef = useRef<string>('');

  // Get WebSocket URL (server-based for SaaS)
  const getWebSocketUrl = () => {
    // Use separate WebSocket server port (3002) to avoid conflicts with Next.js
    const wsPort = '3002';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return `${protocol}//${host}:${wsPort}/api/terminal/ws?session=${sessionIdRef.current}&ticketId=${ticketId}&userId=${userId}&role=${userRole}`;
  };

  // Initialize xterm.js terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Wait for container to have dimensions
    const initTerminal = () => {
      if (!terminalRef.current) return;
      
      const container = terminalRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(initTerminal, 100);
        return;
      }

      console.log('[Terminal] Initializing xterm.js');
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0f172a', // slate-900
          foreground: '#e2e8f0', // slate-200
          cursor: '#60a5fa', // blue-400
          selection: '#334155', // slate-700
          black: '#1e293b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f1f5f9',
          brightBlack: '#475569',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(terminalRef.current);
      
      // Wait a tick before fitting
      setTimeout(() => {
        fitAddon.fit();
        console.log('[Terminal] Terminal opened, writing initial message');
        term.writeln('Terminal initializing...');
        term.write('$ ');
        term.focus(); // Focus the terminal so user can type
      }, 50);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle terminal input
      console.log('[Terminal] Attaching onData handler');
      term.onData((data) => {
        try {
          console.log('[Terminal] onData triggered:', JSON.stringify(data), 'code:', data.charCodeAt(0), 'length:', data.length);
          const code = data.charCodeAt(0);
        
        // Handle Enter key (13 is Enter, but xterm might send '\r' or '\r\n')
        if (code === 13 || data === '\r' || data === '\n' || data === '\r\n') {
          console.log('[Terminal] Enter key detected, currentLine:', currentLineRef.current);
          const command = currentLineRef.current.trim();
          if (command) {
            term.writeln(''); // Move to new line without writing prompt yet
            console.log('[Terminal] Sending command:', command, 'wsRef:', wsRef.current, 'readyState:', wsRef.current?.readyState);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const currentTerm = xtermRef.current;
              const cols = currentTerm?.cols || 120;
              const rows = currentTerm?.rows || 40;
              wsRef.current.send(JSON.stringify({
                type: 'execute',
                command: command,
                userRole,
                cols,
                rows,
              }));
              setIsExecuting(true);
            } else {
              console.error('[Terminal] WebSocket not connected. wsRef:', wsRef.current, 'readyState:', wsRef.current?.readyState);
              term.writeln('Not connected to server');
              term.write('$ ');
            }
          } else {
            term.writeln(''); // Empty command, just new line
            term.write('$ ');
          }
          currentLineRef.current = '';
        }
        // Handle backspace
        else if (code === 127 || code === 8) {
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            term.write('\b \b');
          }
        }
        // Handle printable characters (but not when executing)
        else if (code >= 32) {
          currentLineRef.current += data;
          term.write(data);
        }
        } catch (error) {
          console.error('[Terminal] Error in onData handler:', error);
        }
      });
      console.log('[Terminal] onData handler attached');

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);
    };

    initTerminal();

    return () => {
      window.removeEventListener('resize', () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      });
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, []);

  // Connect to WebSocket server (only when terminal is actually opened/visible)
  useEffect(() => {
    if (!xtermRef.current || !terminalRef.current?.parentElement) return;

    const term = xtermRef.current;
    setIsConnecting(true);

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        setIsConnecting(false);
        term.writeln('\r\n\x1b[33mWarning: Terminal server not available. Start with: npm run terminal-ws\x1b[0m\r\n');
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[Terminal] Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      term.clear();
      term.writeln('\x1b[32m✓ Connected to terminal server\x1b[0m');
      term.writeln('\x1b[36mReady for commands. Type your command and press Enter.\x1b[0m\r\n');
      term.write('$ ');
    };

    ws.onmessage = (event) => {
      try {
        console.log('[Terminal] Received WebSocket message:', event.data);
        const message = JSON.parse(event.data);
        console.log('[Terminal] Parsed message type:', message.type);

        const currentTerm = xtermRef.current;
        if (!currentTerm) {
          console.error('[Terminal] Terminal ref is null!');
          return;
        }

        switch (message.type) {
          case 'ready':
            currentTerm.writeln(`\r\n\x1b[32m${message.message || 'Terminal ready'}\x1b[0m\r\n`);
            break;

          case 'output':
            console.log('[Terminal] Received output:', JSON.stringify(message.data));
            if (message.data) {
              // Write output directly - xterm.js handles newlines correctly with write()
              console.log('[Terminal] Writing output to terminal, length:', message.data.length);
              currentTerm.write(message.data);
              console.log('[Terminal] Output written');
            }
            break;

          case 'error':
            const errorMsg = message.error || message.data || 'Unknown error';
            currentTerm.writeln(`\r\n\x1b[31mERROR: ${errorMsg}\x1b[0m`);
            setIsExecuting(false);
            currentTerm.write('$ ');
            break;

          case 'exit':
            console.log('[Terminal] Command exited with code:', message.code);
            setIsExecuting(false);
            if (message.code !== 0) {
              currentTerm.writeln(`\r\n\x1b[33mCommand exited with code ${message.code}\x1b[0m`);
            }
            currentTerm.writeln(''); // Ensure we're on a new line
            console.log('[Terminal] Writing prompt');
            currentTerm.write('$ ');
            console.log('[Terminal] Prompt written');
            break;

          case 'cancelled':
            term.writeln('\r\n\x1b[33mCommand execution cancelled.\x1b[0m');
            setIsExecuting(false);
            term.write('$ ');
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
      clearTimeout(connectionTimeout);
      console.error('[Terminal] WebSocket error:', error);
      setIsConnecting(false);
      setIsConnected(false);
      if (!isConnected && term) {
        term.writeln('\r\n\x1b[31mFailed to connect to terminal server.\x1b[0m');
        term.writeln('\x1b[33mTerminal server not running. Run: npm run terminal-ws\x1b[0m\r\n');
      }
    };

    ws.onclose = () => {
      console.log('[Terminal] Disconnected from server');
      setIsConnected(false);
      setIsExecuting(false);
      term.writeln('\r\n\x1b[33mDisconnected from terminal server.\x1b[0m\r\n');

      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (xtermRef.current) {
          console.log('[Terminal] Attempting to reconnect...');
          setIsConnecting(true);
          // Reconnect by creating new WebSocket
          const reconnectWs = new WebSocket(getWebSocketUrl());
          reconnectWs.onopen = ws.onopen;
          reconnectWs.onmessage = ws.onmessage;
          reconnectWs.onerror = ws.onerror;
          reconnectWs.onclose = ws.onclose;
          wsRef.current = reconnectWs;
        }
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      clearTimeout(connectionTimeout);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [ticketId, userId, userRole]);

  // Detect and auto-execute AI commands from messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !xtermRef.current || !isConnected) return;

    const term = xtermRef.current;

    const processCommands = () => {
      messages.forEach((msg) => {
        // Skip if we already executed this command
        if (executedCommandsRef.current.has(msg.message_id)) return;

        // Check for TERMINAL_COMMAND marker
        const commandMatch = msg.content.match(/<TERMINAL_COMMAND>(.+?)<\/TERMINAL_COMMAND>/);
        if (commandMatch) {
          const command = commandMatch[1].trim();
          console.log('[Terminal] Auto-executing AI command:', command);
          executedCommandsRef.current.add(msg.message_id);

          // For requester role, require approval
          if (userRole === 'requester') {
            setPendingCommand(command);
            setIsApproving(true);
            term.writeln(`\r\n\x1b[33mAI Agent wants to execute: \x1b[1m${command}\x1b[0m`);
            term.writeln('\x1b[36mWaiting for your approval...\x1b[0m\r\n');
          } else {
            // For agent/admin, execute directly
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              executeCommandDirect(command);
            } else {
              // Wait for connection
              const checkConnection = setInterval(() => {
                if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  clearInterval(checkConnection);
                  executeCommandDirect(command);
                }
              }, 500);
              setTimeout(() => clearInterval(checkConnection), 10000);
            }
          }
        }
      });
    };

    processCommands();
  }, [messages, isConnected, userRole]);

  // Execute command directly
  const executeCommandDirect = (command: string) => {
    if (!command.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    setIsExecuting(true);
    const term = xtermRef.current;
    if (term) {
      term.writeln(`\r\n\x1b[36m$ ${command}\x1b[0m\r\n`);
    }

    const cols = term?.cols || 120;
    const rows = term?.rows || 40;
    wsRef.current.send(JSON.stringify({
      type: 'execute',
      command: command.trim(),
      userRole,
      cols,
      rows,
    }));
  };

  // Handle command approval
  const handleApprove = () => {
    if (pendingCommand) {
      executeCommandDirect(pendingCommand);
      setPendingCommand(null);
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    setPendingCommand(null);
    setIsApproving(false);
    const term = xtermRef.current;
    if (term) {
      term.writeln('\r\n\x1b[33mCommand execution cancelled by user.\x1b[0m\r\n');
    }
  };

  // Handle cancel execution
  const handleCancel = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isExecuting) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
  };

  // Fit terminal on resize
  useEffect(() => {
    if (fitAddonRef.current && !isMinimized) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMinimized]);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 w-full"
        style={{ minHeight: '400px', height: '100%', backgroundColor: '#0f172a' }}
        onClick={() => xtermRef.current?.focus()}
      />

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-slate-700 bg-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isConnecting ? (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-xs text-slate-400">Connecting...</span>
            </>
          ) : isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-300">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-xs text-slate-400">Disconnected</span>
            </>
          )}

          {isExecuting && (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs text-slate-400">Executing...</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExecuting && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs bg-red-600/50 border border-red-500/50 text-red-200 hover:bg-red-600/70 transition-colors"
              title="Cancel Execution"
            >
              <Square className="w-3 h-3 inline mr-1" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      {isApproving && pendingCommand && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Approve Command Execution</h3>
            <p className="text-sm text-slate-400 mb-4">
              The AI agent wants to execute this command:
            </p>
            <div className="bg-slate-900 border border-slate-700 p-3 rounded mb-4">
              <code className="text-yellow-300 text-sm font-mono">{pendingCommand}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 px-4 py-2 bg-green-600/50 border border-green-500/50 text-green-200 hover:bg-green-600/70 transition-colors rounded"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600/50 border border-red-500/50 text-red-200 hover:bg-red-600/70 transition-colors rounded"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
