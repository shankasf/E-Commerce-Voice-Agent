/**
 * Configuration file for Terminal Bridge Client
 */

module.exports = {
  // Backend API base URL
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  
  // WebSocket settings
  WEBSOCKET: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 10000, // 10 seconds
    RECONNECT_DELAY: 5000, // 5 seconds (for future auto-reconnect)
  },
  
  // Request timeouts
  API_TIMEOUT: 10000, // 10 seconds
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warning', 'error'
  
  // Platform-specific settings
  PLATFORM: {
    WINDOWS: {
      shell: 'cmd.exe',
      shellArgs: ['/c']
    },
    UNIX: {
      shell: '/bin/bash',
      shellArgs: ['-c']
    }
  }
};
