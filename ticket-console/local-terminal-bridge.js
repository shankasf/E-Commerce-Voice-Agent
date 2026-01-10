#!/usr/bin/env node

/**
 * Local Terminal Bridge Service
 * 
 * This service runs on the user's local machine and opens their actual terminal.
 * It connects to the web app via WebSocket and allows agents to help execute commands.
 * 
 * Usage:
 *   node local-terminal-bridge.js
 * 
 * Or install globally:
 *   npm install -g
 *   terminal-bridge
 */

const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const WS_PORT = 8080;
const HTTP_PORT = 8081;

let wss = null;
let clients = new Set();
let terminalProcess = null;

// Open terminal window based on OS
function openTerminalWindow() {
  const platform = os.platform();
  console.log(`[Terminal Bridge] Opening terminal for ${platform}...`);

  try {
    if (platform === 'darwin') {
      // macOS - Open Terminal.app with a new window
      spawn('osascript', ['-e', 'tell application "Terminal" to do script "echo Terminal Bridge Connected - Waiting for commands..."']);
      console.log('[Terminal Bridge] Terminal.app opened on macOS');
    } else if (platform === 'win32') {
      // Windows - Open Command Prompt
      spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'echo Terminal Bridge Connected - Waiting for commands...']);
      console.log('[Terminal Bridge] Command Prompt opened on Windows');
    } else {
      // Linux - Try gnome-terminal, xterm, or default
      const terminals = ['gnome-terminal', 'xterm', 'konsole', 'terminator'];
      let opened = false;
      
      for (const term of terminals) {
        try {
          if (term === 'gnome-terminal') {
            spawn('gnome-terminal', ['--', 'bash', '-c', 'echo "Terminal Bridge Connected - Waiting for commands..."; exec bash']);
          } else if (term === 'xterm') {
            spawn('xterm', ['-e', 'bash', '-c', 'echo "Terminal Bridge Connected - Waiting for commands..."; exec bash']);
          } else if (term === 'konsole') {
            spawn('konsole', ['-e', 'bash', '-c', 'echo "Terminal Bridge Connected - Waiting for commands..."; exec bash']);
          } else if (term === 'terminator') {
            spawn('terminator', ['-e', 'bash -c "echo \\"Terminal Bridge Connected - Waiting for commands...\\"; exec bash"']);
          }
          opened = true;
          console.log(`[Terminal Bridge] ${term} opened on Linux`);
          break;
        } catch (err) {
          // Try next terminal
        }
      }
      
      if (!opened) {
        console.error('[Terminal Bridge] Could not open terminal on Linux. Please install gnome-terminal, xterm, or konsole.');
      }
    }
  } catch (error) {
    console.error('[Terminal Bridge] Error opening terminal:', error.message);
  }
}

// Start WebSocket server
function startWebSocketServer() {
  const server = http.createServer();
  
  wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false,
  });

  server.listen(WS_PORT, () => {
    console.log(`[Terminal Bridge] WebSocket server listening on ws://localhost:${WS_PORT}`);
  });

  wss.on('connection', (ws, req) => {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    console.log(`[Terminal Bridge] Client connected: ${clientId}`);
    clients.add(ws);

    // Send ready message
    ws.send(JSON.stringify({
      type: 'ready',
      platform: os.platform(),
      cwd: process.cwd(),
      message: 'Terminal bridge connected. Ready to execute commands.',
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[Terminal Bridge] Received from ${clientId}:`, message.type);

        switch (message.type) {
          case 'execute':
            await executeCommand(ws, message.command, message.cwd);
            break;
          case 'cancel':
            cancelExecution(ws);
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            console.log('[Terminal Bridge] Unknown message type:', message.type);
            ws.send(JSON.stringify({
              type: 'error',
              error: `Unknown message type: ${message.type}`,
            }));
        }
      } catch (error) {
        console.error('[Terminal Bridge] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message,
        }));
      }
    });

    ws.on('error', (error) => {
      console.error(`[Terminal Bridge] WebSocket error for ${clientId}:`, error.message);
    });

    ws.on('close', () => {
      console.log(`[Terminal Bridge] Client disconnected: ${clientId}`);
      clients.delete(ws);
      
      // If this was the active client, cancel any running process
      if (terminalProcess) {
        terminalProcess.kill();
        terminalProcess = null;
      }
    });
  });
}

// Execute command in terminal
function executeCommand(ws, command, workingDir) {
  if (!command || !command.trim()) {
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Empty command',
    }));
    return;
  }

  console.log(`[Terminal Bridge] Executing: ${command}`);

  // Cancel any existing process
  if (terminalProcess) {
    terminalProcess.kill();
  }

  // Determine shell based on platform
  const platform = os.platform();
  const shell = platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  const shellArgs = platform === 'win32' ? ['/c'] : ['-c'];
  const cwd = workingDir || process.cwd();

  terminalProcess = spawn(shell, [...shellArgs, command], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Stream stdout
  terminalProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Terminal Bridge] Output:', output);
    ws.send(JSON.stringify({
      type: 'output',
      data: output,
    }));
  });

  // Stream stderr
  terminalProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('[Terminal Bridge] Error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: error,
    }));
  });

  // Handle exit
  terminalProcess.on('exit', (code) => {
    console.log(`[Terminal Bridge] Command exited with code ${code}`);
    ws.send(JSON.stringify({
      type: 'exit',
      code: code || 0,
    }));
    terminalProcess = null;
  });

  // Handle errors
  terminalProcess.on('error', (error) => {
    console.error('[Terminal Bridge] Process error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: error.message,
    }));
    terminalProcess = null;
  });
}

// Cancel current execution
function cancelExecution(ws) {
  if (terminalProcess) {
    console.log('[Terminal Bridge] Cancelling execution...');
    terminalProcess.kill('SIGTERM');
    terminalProcess = null;
    ws.send(JSON.stringify({
      type: 'cancelled',
    }));
  }
}

// Main
console.log('='.repeat(50));
console.log('Terminal Bridge Service');
console.log('='.repeat(50));
console.log(`[Terminal Bridge] Starting on ${os.platform()}...`);
console.log(`[Terminal Bridge] WebSocket server: ws://localhost:${WS_PORT}`);
console.log('');

// Open terminal window
openTerminalWindow();

// Start WebSocket server
startWebSocketServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Terminal Bridge] Shutting down...');
  if (terminalProcess) {
    terminalProcess.kill();
  }
  if (wss) {
    wss.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Terminal Bridge] Shutting down...');
  if (terminalProcess) {
    terminalProcess.kill();
  }
  if (wss) {
    wss.close();
  }
  process.exit(0);
});

