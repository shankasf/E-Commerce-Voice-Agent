/**
 * Connection Registry - Manages active WebSocket connections from Windows/Linux devices
 * Ported from Python FastAPI to TypeScript/Next.js
 */

import { WebSocket } from 'ws';

interface DeviceInfo {
  user_id?: string;
  device_name?: string;
  connected_at: string;
}

export class ConnectionRegistry {
  private connections: Map<string, WebSocket> = new Map();
  private deviceInfo: Map<string, DeviceInfo> = new Map();
  private lock: Promise<void> = Promise.resolve();

  /**
   * Register a new device connection
   */
  async registerConnection(
    deviceId: string,
    connection: WebSocket,
    userId?: string,
    deviceName?: string
  ): Promise<void> {
    await this.withLock(async () => {
      // Close existing connection if any
      if (this.connections.has(deviceId)) {
        try {
          const oldConn = this.connections.get(deviceId);
          if (oldConn && oldConn.readyState === WebSocket.OPEN) {
            oldConn.close();
          }
        } catch (error) {
          console.error(`Error closing old connection for device ${deviceId}:`, error);
        }
      }

      this.connections.set(deviceId, connection);
      this.deviceInfo.set(deviceId, {
        user_id: userId,
        device_name: deviceName,
        connected_at: new Date().toISOString(),
      });

      console.log(
        `Device ${deviceId} (${deviceName}) connected. Total active connections: ${this.connections.size}`
      );
    });
  }

  /**
   * Unregister a device connection
   */
  async unregisterConnection(deviceId: string): Promise<void> {
    await this.withLock(async () => {
      if (this.connections.has(deviceId)) {
        this.connections.delete(deviceId);
      }
      if (this.deviceInfo.has(deviceId)) {
        this.deviceInfo.delete(deviceId);
      }
      console.log(
        `Device ${deviceId} disconnected. Total active connections: ${this.connections.size}`
      );
    });
  }

  /**
   * Get connection for a device
   */
  getConnection(deviceId: string): WebSocket | undefined {
    return this.connections.get(deviceId);
  }

  /**
   * Check if device is connected
   */
  isConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      return false;
    }

    // Check if connection is still open
    return connection.readyState === WebSocket.OPEN;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): Map<string, WebSocket> {
    return new Map(this.connections);
  }

  /**
   * Get device information
   */
  getDeviceInfo(deviceId: string): DeviceInfo | undefined {
    return this.deviceInfo.get(deviceId);
  }

  /**
   * Send a message to a device
   * Returns true if sent successfully, false otherwise
   */
  async sendToDevice(deviceId: string, message: any): Promise<boolean> {
    const connection = this.getConnection(deviceId);
    if (!connection) {
      return false;
    }

    if (!this.isConnected(deviceId)) {
      await this.unregisterConnection(deviceId);
      return false;
    }

    try {
      const messageJson = JSON.stringify(message);
      connection.send(messageJson);
      return true;
    } catch (error) {
      console.error(`Error sending message to device ${deviceId}:`, error);
      await this.unregisterConnection(deviceId);
      return false;
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    await this.withLock(async () => {
      for (const [deviceId, connection] of this.connections.entries()) {
        try {
          if (connection.readyState === WebSocket.OPEN) {
            connection.close();
          }
        } catch (error) {
          console.error(`Error closing connection for device ${deviceId}:`, error);
        }
      }
      this.connections.clear();
      this.deviceInfo.clear();
    });
  }

  /**
   * Helper method to implement async locking
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const previousLock = this.lock;
    let releaseLock: () => void;

    this.lock = new Promise((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;
    try {
      return await fn();
    } finally {
      releaseLock!();
    }
  }
}

// Singleton instance for the connection registry
let connectionRegistryInstance: ConnectionRegistry | null = null;

export function getConnectionRegistry(): ConnectionRegistry {
  if (!connectionRegistryInstance) {
    connectionRegistryInstance = new ConnectionRegistry();
  }
  return connectionRegistryInstance;
}
