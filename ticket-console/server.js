const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('ws');
const { spawn } = require('child_process');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active terminal sessions
const terminalSessions = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server for terminal connections
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
            if (!isCommandAllowed(command, message.userRole || 'requester')) {
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Command not allowed for your role',
              }));
              return;
            }

            session.isExecuting = true;
            isExecuting = true;
            await executeCommand(ws, command, message.cwd || process.cwd(), sessionId, session);
            session.isExecuting = false;
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
    console.error('Server error:', err);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Terminal WebSocket server ready on ws://${hostname}:${port}/api/terminal/ws`);
  });
});

// Execute command in terminal
function executeCommand(ws, command, workingDir, sessionId, session) {
  return new Promise((resolve) => {
    console.log(`[Terminal WS] ${sessionId} Executing: ${command}`);

    const platform = os.platform();
    const shell = platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellArgs = platform === 'win32' ? ['/c'] : ['-c'];

    const process = spawn(shell, [...shellArgs, command], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    // Update session with process
    if (session) {
      session.process = process;
    }

    // Stream stdout
    process.stdout.on('data', (data) => {
      const output = data.toString();
      ws.send(JSON.stringify({
        type: 'output',
        data: output,
      }));
    });

    // Stream stderr
    process.stderr.on('data', (data) => {
      const error = data.toString();
      ws.send(JSON.stringify({
        type: 'error',
        data: error,
      }));
    });

    // Handle exit
    process.on('exit', (code) => {
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
    process.on('error', (error) => {
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
