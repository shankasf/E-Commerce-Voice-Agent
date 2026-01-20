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
const { Server: WebSocketServer } = require('ws');
const http = require('http');
const axios = require('axios');
const os = require('os');
const config = require('./config');

// Configuration
const API_BASE_URL = config.API_BASE_URL;
const WEBSOCKET_HEARTBEAT_INTERVAL = config.WEBSOCKET.HEARTBEAT_INTERVAL;
const WEBSOCKET_TIMEOUT = config.WEBSOCKET.CONNECTION_TIMEOUT;
const LOCAL_WS_PORT = process.env.LOCAL_WS_PORT || 8000;

// Global state
let localWSServer = null;
let httpServer = null;
let heartbeatInterval = null;
let isActive = false;
let sessionId = null;

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
 * Step 1: Collect only the 6-digit code from user
 * user_id, device_id, organization_id will be retrieved automatically from verification response
 */
async function collectCode() {
  log('Welcome to Terminal Bridge Client', 'info');
  
  // Only prompt for 6-digit code
  const sixDigitCode = await question('Enter 6-digit code: ');
  
  return {
    six_digit_code: sixDigitCode.trim().toUpperCase()
  };
}

/**
 * Step 2: Verify code and get session info
 */
async function verifyCode(codeData) {
  try {
    log('Verifying code with backend...', 'info');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/client-application/device-connections/verify-code-return-url`,
      codeData,
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
      
      // Log the retrieved info
      if (response.data.user_id && response.data.device_id && response.data.organization_id) {
        log(`User ID: ${response.data.user_id}, Device ID: ${response.data.device_id}, Organization ID: ${response.data.organization_id}`, 'info');
      }
      
      return {
        session_id: response.data.session_id,
        user_id: response.data.user_id,
        device_id: response.data.device_id,
        organization_id: response.data.organization_id,
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
 * Step 3: Start local WebSocket server on user's machine
 */
function startLocalWebSocketServer(connectionSessionId) {
  return new Promise((resolve, reject) => {
    sessionId = connectionSessionId;
    
    log('Starting local WebSocket server...', 'info');
    
    // Create HTTP server
    httpServer = http.createServer();
    
    // Create WebSocket server
    localWSServer = new WebSocketServer({ server: httpServer });
    
    let lastHeartbeat = Date.now();
    let activeConnection = null;
    
    // Heartbeat timeout (60 seconds)
    const HEARTBEAT_TIMEOUT = 60000;
    
    // Start heartbeat monitoring
    heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        log('Heartbeat timeout - closing connection', 'warning');
        if (activeConnection) {
          activeConnection.close(1008, 'Heartbeat timeout');
        }
        cleanup();
      }
    }, 15000); // Check every 15 seconds
    
    localWSServer.on('connection', (ws) => {
      log('New connection to local WebSocket server', 'success');
      activeConnection = ws;
      lastHeartbeat = Date.now();
      isActive = true;
      
      // Send handshake acknowledgment
      ws.send(JSON.stringify({
        type: 'handshake_ack',
        session_id: sessionId,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          lastHeartbeat = Date.now();
          
          // Handle heartbeat
          if (message.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          }
          
          // Handle handshake
          if (message.type === 'handshake') {
            ws.send(JSON.stringify({
              type: 'handshake_ack',
              session_id: sessionId,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          log(`Error handling message: ${error.message}`, 'error');
        }
      });
      
      ws.on('close', () => {
        log('Connection to local WebSocket server closed', 'warning');
        activeConnection = null;
        isActive = false;
        cleanup();
      });
      
      ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`, 'error');
      });
    });
    
    httpServer.listen(LOCAL_WS_PORT, () => {
      const wsUrl = `ws://localhost:${LOCAL_WS_PORT}`;
      log(`Local WebSocket server running on ${wsUrl}`, 'success');
      log('WebSocket server is ready for connections', 'info');
      
      // Start heartbeat
      startHeartbeat(sessionId);
      
      resolve(wsUrl);
    });
    
    httpServer.on('error', (error) => {
      log(`Failed to start WebSocket server: ${error.message}`, 'error');
      reject(error);
    });
  });
}


// Command execution removed - Windows app is only for connection bridge
// Commands are executed by the WebSocket server, not the Windows app

/**
 * Start heartbeat mechanism
 */
function startHeartbeat(sessionId) {
  log('Heartbeat monitoring started', 'info');
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
  
  if (localWSServer) {
    localWSServer.close();
    localWSServer = null;
  }
  
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  
  isActive = false;
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  log('\nShutting down...', 'warning');
  
  cleanup();
  rl.close();
  process.exit(0);
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
    // Step 1: Collect 6-digit code only
    const codeData = await collectCode();
    
    // Step 2: Verify code (user_id, device_id, organization_id retrieved automatically)
    const connectionInfo = await verifyCode(codeData);
    
    // Step 3: Start local WebSocket server on user's machine
    await startLocalWebSocketServer(connectionInfo.session_id);
    
    log('\n=== WebSocket Server Started ===', 'success');
    log(`WebSocket server running on ws://localhost:${LOCAL_WS_PORT}`, 'info');
    log('Ready for connections. Press Ctrl+C to stop\n', 'info');
    
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
