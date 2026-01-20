const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Server: WebSocketServer } = require('ws');
const http = require('http');
const axios = require('axios');
const config = require('./config');

// Keep a global reference to avoid garbage collection
let mainWindow = null;
let localWSServer = null;
let httpServer = null;
let heartbeatInterval = null;
let isActive = false;
let sessionId = null;
const LOCAL_WS_PORT = process.env.LOCAL_WS_PORT || 8000;

const API_BASE_URL = config.API_BASE_URL;
const HEARTBEAT_TIMEOUT = 60000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false,
    title: 'Terminal Bridge Client'
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle verify code request from renderer
ipcMain.handle('verify-code', async (event, code) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/client-application/device-connections/verify-code-return-url`,
      { six_digit_code: code.trim().toUpperCase() },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.API_TIMEOUT
      }
    );
    
    if (response.data.success) {
      sessionId = response.data.session_id;
      await startLocalWebSocketServer(sessionId);
      return {
        success: true,
        session_id: response.data.session_id,
        expires_in: response.data.expires_in_seconds,
        user_id: response.data.user_id,
        device_id: response.data.device_id,
        organization_id: response.data.organization_id
      };
    }
    return { success: false, error: 'Verification failed' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Verification failed'
    };
  }
});

// Start local WebSocket server
async function startLocalWebSocketServer(connectionSessionId) {
  return new Promise((resolve, reject) => {
    if (localWSServer || httpServer) {
      return resolve();
    }

    httpServer = http.createServer();
    localWSServer = new WebSocketServer({ server: httpServer });
    
    let lastHeartbeat = Date.now();
    let activeConnection = null;
    
    // Start heartbeat monitoring
    heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        if (activeConnection) {
          activeConnection.close(1008, 'Heartbeat timeout');
        }
        cleanup();
        if (mainWindow) {
          mainWindow.webContents.send('connection-status', { connected: false, error: 'Heartbeat timeout' });
        }
      }
    }, 15000);
    
    localWSServer.on('connection', (ws) => {
      activeConnection = ws;
      lastHeartbeat = Date.now();
      isActive = true;
      
      if (mainWindow) {
        mainWindow.webContents.send('connection-status', { connected: true });
      }
      
      // Send handshake acknowledgment
      ws.send(JSON.stringify({
        type: 'handshake_ack',
        session_id: connectionSessionId,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          lastHeartbeat = Date.now();
          
          if (message.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          }
          
          if (message.type === 'handshake') {
            ws.send(JSON.stringify({
              type: 'handshake_ack',
              session_id: connectionSessionId,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });
      
      ws.on('close', () => {
        activeConnection = null;
        isActive = false;
        cleanup();
        if (mainWindow) {
          mainWindow.webContents.send('connection-status', { connected: false });
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    httpServer.listen(LOCAL_WS_PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${LOCAL_WS_PORT}`);
      resolve();
    });
    
    httpServer.on('error', (error) => {
      reject(error);
    });
  });
}

function cleanup() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
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

// Get connection status
ipcMain.handle('get-status', () => {
  return {
    connected: isActive,
    port: LOCAL_WS_PORT,
    sessionId: sessionId
  };
});
