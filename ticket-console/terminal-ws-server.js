/**
 * Standalone WebSocket Server for Terminal
 * Runs on a separate port (3002) to avoid conflicts with Next.js
 */

const { Server } = require('ws');
const http = require('http');
const { spawn } = require('child_process');
const os = require('os');

const WS_PORT = parseInt(process.env.TERMINAL_WS_PORT || '3002', 10);

// Store active terminal sessions
const terminalSessions = new Map();

// Create HTTP server for WebSocket upgrade
const server = http.createServer();

// Create WebSocket server
const wss = new Server({ 
  server,
  path: '/api/terminal/ws'
});

wss.on('connection', (ws, req) => {
  const sessionId = req.url.split('?')[1]?.split('&').find(p => p.startsWith('session='))?.split('=')[1] || 
                   `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Terminal WS] New connection: ${sessionId}`);
  
  let terminalProcess = null;
  let isExecuting = false;
  
  const session = { ws, process: terminalProcess, isExecuting };
  terminalSessions.set(sessionId, session);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'ready',
    sessionId,
    platform: os.platform(),
    cwd: process.cwd(),
    message: 'Terminal connected. Ready for commands.',
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[Terminal WS] ${sessionId} received:`, message.type);

      switch (message.type) {
        case 'execute':
          const session = terminalSessions.get(sessionId);
          if (session && session.isExecuting) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Another command is already executing',
            }));
            return;
          }

          const command = message.command?.trim();
          if (!command) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Empty command',
            }));
            return;
          }

          // Security: Check if command is allowed
          const userRole = message.userRole || 'requester';
          if (!isCommandAllowed(command, userRole)) {
            ws.send(JSON.stringify({
              type: 'error',
              error: `Command not allowed for ${userRole} role`,
            }));
            return;
          }

          if (session) {
            session.isExecuting = true;
          }
          isExecuting = true;
          const cols = message.cols || 120;
          const rows = message.rows || 40;
          await executeCommand(ws, command, message.cwd || process.cwd(), sessionId, session, cols, rows);
          if (session) {
            session.isExecuting = false;
          }
          isExecuting = false;
          break;

        case 'cancel':
          const cancelSession = terminalSessions.get(sessionId);
          if (cancelSession && cancelSession.process) {
            cancelSession.process.kill('SIGTERM');
            cancelSession.process = null;
            cancelSession.isExecuting = false;
            ws.send(JSON.stringify({
              type: 'cancelled',
            }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${message.type}`,
          }));
      }
    } catch (error) {
      console.error(`[Terminal WS] ${sessionId} error:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
      }));
    }
  });

  ws.on('close', () => {
    console.log(`[Terminal WS] ${sessionId} disconnected`);
    const session = terminalSessions.get(sessionId);
    if (session && session.process) {
      session.process.kill();
      session.process = null;
    }
    terminalSessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`[Terminal WS] ${sessionId} WebSocket error:`, error);
  });
});

server.on('error', (err) => {
  console.error('Terminal WebSocket server error:', err);
});

server.listen(WS_PORT, () => {
  console.log(`> Terminal WebSocket server ready on ws://localhost:${WS_PORT}/api/terminal/ws`);
});

// Execute command in terminal
function executeCommand(ws, command, workingDir, sessionId, session, cols = 120, rows = 40) {
  return new Promise((resolve) => {
    console.log(`[Terminal WS] ${sessionId} Executing: ${command}`);

    const platform = os.platform();
    const shell = platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellArgs = platform === 'win32' ? ['/c'] : ['-c'];

    const childProcess = spawn(shell, [...shellArgs, command], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        TERM: 'xterm-256color',
        COLUMNS: cols.toString(),
        LINES: rows.toString(),
      },
    });

    // Update session with process
    if (session) {
      session.process = childProcess;
    }

    // Stream stdout
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      ws.send(JSON.stringify({
        type: 'output',
        data: output,
      }));
    });

    // Stream stderr
    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      ws.send(JSON.stringify({
        type: 'error',
        data: error,
      }));
    });

    // Handle exit
    childProcess.on('exit', (code) => {
      console.log(`[Terminal WS] ${sessionId} Command exited with code ${code}`);
      ws.send(JSON.stringify({
        type: 'exit',
        code: code || 0,
      }));
      
      if (session) {
        session.process = null;
        session.isExecuting = false;
      }
      
      resolve();
    });

    // Handle errors
    childProcess.on('error', (error) => {
      console.error(`[Terminal WS] ${sessionId} Process error:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
      }));
      
      if (session) {
        session.process = null;
        session.isExecuting = false;
      }
      
      resolve();
    });
  });
}

// Security: Command whitelisting
function isCommandAllowed(command, userRole) {
  const lowerCommand = command.toLowerCase().trim();

  // Dangerous commands that should never be allowed
  const blacklist = [
    'rm -rf /',
    'rm -rf ~',
    'format c:',
    'del /f /s /q',
    'mkfs',
    'dd if=',
    'shutdown',
    'reboot',
    'halt',
  ];

  for (const blocked of blacklist) {
    if (lowerCommand.includes(blocked)) {
      return false;
    }
  }

  // Role-based permissions
  if (userRole === 'requester') {
    // Requesters: Read-only commands
    const requesterWhitelist = [
      'ls', 'dir', 'pwd', 'cd', 'cat', 'type', 'head', 'tail',
      'grep', 'find', 'which', 'where', 'whoami', 'uname',
      'date', 'echo', 'env', 'printenv', 'ps', 'top', 'htop',
      'df', 'du', 'free', 'uptime', 'ping', 'curl', 'wget',
      'git status', 'git log', 'git diff', 'git branch',
      'npm list', 'npm view', 'node --version', 'python --version',
    ];

    return requesterWhitelist.some(allowed => lowerCommand.startsWith(allowed));
  } else if (userRole === 'agent' || userRole === 'admin') {
    // Agents/Admins: Extended permissions (but still restricted)
    // Allow most commands except dangerous ones
    return true;
  }

  return false;
}

