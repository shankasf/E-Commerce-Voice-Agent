#!/usr/bin/env node

/**
 * Windows Terminal Bridge Client
 * 
 * This application:
 * 1. Receives 6-digit code from user
 * 2. Verifies code with backend
 * 3. Establishes WebSocket connection
 * 4. Handles terminal command execution
 * 5. Maintains heartbeat for connection keepalive
 */

const readline = require('readline');
const WebSocket = require('ws');
const axios = require('axios');
const { spawn } = require('child_process');
const os = require('os');
const config = require('./config');

// Configuration
const API_BASE_URL = config.API_BASE_URL;
const WEBSOCKET_HEARTBEAT_INTERVAL = config.WEBSOCKET.HEARTBEAT_INTERVAL;
const WEBSOCKET_TIMEOUT = config.WEBSOCKET.CONNECTION_TIMEOUT;

// Global state
let websocket = null;
let heartbeatInterval = null;
let currentProcess = null;
let isActive = false;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to get user input
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Helper function to log with timestamp
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': 'ℹ',
    'success': '✓',
    'error': '✗',
    'warning': '⚠'
  }[type] || 'ℹ';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Step 1: Get user information from command line args or environment
 * Step 2: Collect only the 6-digit code from user
 */
async function collectUserInfo() {
  log('Welcome to Terminal Bridge Client', 'info');
  
  // Get user_id, device_id, organization_id from command line args or environment
  const args = process.argv.slice(2);
  let userId, deviceId, organizationId;
  
  // Try to get from command line args: --user-id=1 --device-id=1 --organization-id=1
  for (const arg of args) {
    if (arg.startsWith('--user-id=')) {
      userId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--device-id=')) {
      deviceId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--organization-id=')) {
      organizationId = parseInt(arg.split('=')[1]);
    }
  }
  
  // If not provided, try environment variables
  userId = userId || parseInt(process.env.USER_ID) || parseInt(process.env.USERID);
  deviceId = deviceId || parseInt(process.env.DEVICE_ID) || parseInt(process.env.DEVICEID);
  organizationId = organizationId || parseInt(process.env.ORGANIZATION_ID) || parseInt(process.env.ORG_ID);
  
  // Validate required parameters
  if (!userId || !deviceId || !organizationId) {
    log('Error: user_id, device_id, and organization_id are required', 'error');
    log('Provide them via:', 'info');
    log('  - Command line: --user-id=1 --device-id=1 --organization-id=1', 'info');
    log('  - Environment variables: USER_ID, DEVICE_ID, ORGANIZATION_ID', 'info');
    throw new Error('Missing required parameters');
  }
  
  log(`User ID: ${userId}, Device ID: ${deviceId}, Organization ID: ${organizationId}`, 'info');
  
  // Only prompt for 6-digit code
  const sixDigitCode = await question('Enter 6-digit code: ');
  
  return {
    user_id: userId,
    device_id: deviceId,
    organization_id: organizationId,
    six_digit_code: sixDigitCode.trim().toUpperCase()
  };
}

/**
 * Step 2: Verify code and get WebSocket URL
 */
async function verifyCodeAndGetUrl(userData) {
  try {
    log('Verifying code with backend...', 'info');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/client-application/device-connections/verify-code-return-url`,
      userData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.API_TIMEOUT
      }
    );
    
    if (response.data.success) {
      log('Code verified successfully!', 'success');
      log(`Session expires in ${response.data.expires_in_seconds} seconds`, 'info');
      
      return {
        websocket_url: response.data.websocket_url,
        session_id: response.data.session_id,
        expires_in: response.data.expires_in_seconds
      };
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    if (error.response) {
      log(`Error: ${error.response.data.error || error.response.statusText}`, 'error');
    } else if (error.request) {
      log('Error: Could not reach backend server', 'error');
    } else {
      log(`Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

/**
 * Step 3: Establish WebSocket connection
 */
function connectWebSocket(websocketUrl, sessionId) {
  return new Promise((resolve, reject) => {
    log(`Connecting to WebSocket: ${websocketUrl}`, 'info');
    
    websocket = new WebSocket(websocketUrl);
    
    const connectTimeout = setTimeout(() => {
      websocket.close();
      reject(new Error('Connection timeout'));
    }, WEBSOCKET_TIMEOUT);
    
    websocket.on('open', () => {
      clearTimeout(connectTimeout);
      log('WebSocket connected successfully!', 'success');
      log('Sending handshake...', 'info');
      
      // Note: isActive will be set to true after handshake_ack from server
      
      // Send initial handshake
      sendMessage({
        type: 'handshake',
        session_id: sessionId,
        platform: os.platform(),
        hostname: os.hostname(),
        cwd: process.cwd(),
        timestamp: new Date().toISOString()
      });
      
      // Start heartbeat
      startHeartbeat(sessionId);
      
      resolve();
    });
    
    websocket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(message);
      } catch (error) {
        log(`Error parsing message: ${error.message}`, 'error');
      }
    });
    
    websocket.on('error', (error) => {
      clearTimeout(connectTimeout);
      log(`WebSocket error: ${error.message}`, 'error');
      reject(error);
    });
    
    websocket.on('close', (code, reason) => {
      log(`WebSocket closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`, 'warning');
      isActive = false;
      stopHeartbeat();
      cleanup();
    });
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'handshake_ack':
      log('Handshake acknowledged by server', 'success');
      isActive = true; // Mark as active after handshake acknowledgment
      log('Terminal bridge is now active. Waiting for commands...', 'success');
      break;
      
    case 'execute_command':
      executeCommand(message.command, message.cwd || process.cwd());
      break;
      
    case 'cancel_command':
      cancelCommand();
      break;
      
    case 'ping':
      sendMessage({ type: 'pong' });
      break;
      
    case 'heartbeat':
      sendMessage({ type: 'heartbeat_ack' });
      break;
      
    case 'output':
      // Server sending output (echo back or logging)
      if (message.data) {
        process.stdout.write(message.data);
      }
      break;
      
    case 'error':
      log(`Server error: ${message.error || message.message}`, 'error');
      break;
      
    case 'exit':
      log(`Command exited with code: ${message.code}`, 'info');
      break;
      
    default:
      log(`Unknown message type: ${message.type}`, 'warning');
  }
}

/**
 * Send message via WebSocket
 */
function sendMessage(message) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    try {
      websocket.send(JSON.stringify(message));
    } catch (error) {
      log(`Error sending message: ${error.message}`, 'error');
    }
  }
}

/**
 * Execute terminal command
 */
function executeCommand(command, workingDir) {
  if (!command || !command.trim()) {
    sendMessage({ type: 'error', error: 'Empty command' });
    return;
  }
  
  // Cancel any existing process
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
  }
  
  log(`Executing command: ${command}`, 'info');
  
  const platform = os.platform();
  const platformConfig = platform === 'win32' 
    ? config.PLATFORM.WINDOWS 
    : config.PLATFORM.UNIX;
  const shell = platformConfig.shell;
  const shellArgs = platformConfig.shellArgs;
  
  currentProcess = spawn(shell, [...shellArgs, command], {
    cwd: workingDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  // Stream stdout
  currentProcess.stdout.on('data', (data) => {
    const output = data.toString();
    sendMessage({
      type: 'output',
      data: output
    });
  });
  
  // Stream stderr
  currentProcess.stderr.on('data', (data) => {
    const error = data.toString();
    sendMessage({
      type: 'error',
      data: error
    });
  });
  
  // Handle exit
  currentProcess.on('exit', (code) => {
    log(`Command exited with code: ${code}`, 'info');
    sendMessage({
      type: 'exit',
      code: code || 0
    });
    currentProcess = null;
  });
  
  // Handle errors
  currentProcess.on('error', (error) => {
    log(`Process error: ${error.message}`, 'error');
    sendMessage({
      type: 'error',
      error: error.message
    });
    currentProcess = null;
  });
}

/**
 * Cancel current command execution
 */
function cancelCommand() {
  if (currentProcess) {
    log('Cancelling command execution...', 'warning');
    currentProcess.kill('SIGTERM');
    sendMessage({ type: 'cancelled' });
    currentProcess = null;
  }
}

/**
 * Start heartbeat mechanism
 */
function startHeartbeat(sessionId) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN && isActive) {
      sendMessage({
        type: 'heartbeat',
        session_id: sessionId,
        timestamp: new Date().toISOString()
      });
    } else {
      log('Connection lost, stopping heartbeat', 'warning');
      stopHeartbeat();
    }
  }, WEBSOCKET_HEARTBEAT_INTERVAL);
  
  log('Heartbeat started', 'info');
}

/**
 * Stop heartbeat mechanism
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    log('Heartbeat stopped', 'info');
  }
}

/**
 * Cleanup function
 */
function cleanup() {
  stopHeartbeat();
  
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
  }
  
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  
  isActive = false;
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  log('\nShutting down...', 'warning');
  
  // Send disconnect message
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    sendMessage({ type: 'disconnect', reason: 'user_shutdown' });
    setTimeout(() => {
      cleanup();
      rl.close();
      process.exit(0);
    }, 500);
  } else {
    cleanup();
    rl.close();
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  log('\nShutting down...', 'warning');
  cleanup();
  rl.close();
  process.exit(0);
});

/**
 * Main execution flow
 */
async function main() {
  try {
    // Step 1: Collect user information
    const userData = await collectUserInfo();
    
    // Step 2: Verify code and get WebSocket URL
    const connectionInfo = await verifyCodeAndGetUrl(userData);
    
    // Step 3: Establish WebSocket connection
    await connectWebSocket(connectionInfo.websocket_url, connectionInfo.session_id);
    
    log('\n=== Terminal Bridge Connected ===', 'success');
    log('Waiting for handshake acknowledgment...', 'info');
    log('Press Ctrl+C to disconnect\n', 'info');
    
    // Keep process running
    // Connection is handled via WebSocket events
    
  } catch (error) {
    log(`Failed to establish connection: ${error.message}`, 'error');
    log('Please check your code and try again', 'warning');
    rl.close();
    process.exit(1);
  }
}

// Start application
if (require.main === module) {
  main().catch((error) => {
    log(`Fatal error: ${error.message}`, 'error');
    rl.close();
    process.exit(1);
  });
}
