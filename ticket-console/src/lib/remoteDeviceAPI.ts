/**
 * Remote Device API Client
 * 
 * Handles all API calls for remote endpoint agent device management
 * and remote diagnostic execution.
 */

export type RemoteDevice = {
  device_id: string;
  device_name: string;
  ticket_id?: number;
  org_id?: number;
  status: 'pending' | 'active' | 'disabled';
  connected: boolean;
  last_seen?: string;
  enrollment_code?: string;
};

export type Diagnostic = {
  id: string;
  name: string;
  description: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
  params?: string[];
};

export type DiagnosticExecutionResult = {
  ok: boolean;
  approval_id?: string;
  result?: {
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
    truncated?: boolean;
    redactions?: number;
    warnings?: string[];
    execution_time_ms: number;
    error?: string;
  };
  error?: string;
};

export const remoteDeviceAPI = {
  /**
   * Create a new device registration
   */
  async createDevice(
    ticketId: number,
    deviceName: string,
    orgId?: number
  ): Promise<{ ok: boolean; device?: RemoteDevice; message?: string; error?: string }> {
    try {
      const res = await fetch('/tms/api/remote-agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ticket_id: ticketId,
          device_name: deviceName,
          org_id: orgId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to create device' };
      }

      return { ok: true, device: data.device, message: data.message };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },

  /**
   * Get devices for a ticket or all devices
   */
  async getDevices(ticketId?: number): Promise<{ ok: boolean; devices?: RemoteDevice[]; error?: string }> {
    try {
      const url = ticketId
        ? `/tms/api/remote-agent/register?ticket_id=${ticketId}`
        : '/tms/api/remote-agent/register';
      
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to get devices' };
      }

      return { ok: true, devices: data.devices || [] };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },

  /**
   * Get a single device by ID
   */
  async getDevice(deviceId: string): Promise<{ ok: boolean; device?: RemoteDevice; error?: string }> {
    try {
      const res = await fetch(`/tms/api/remote-agent/register?device_id=${deviceId}`);
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Device not found' };
      }

      return { ok: true, device: data.device };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },

  /**
   * Disable a device (kill switch)
   */
  async disableDevice(deviceId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/tms/api/remote-agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          device_id: deviceId,
          reason: reason || 'Disabled by agent',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to disable device' };
      }

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },

  /**
   * Delete a device permanently
   */
  async deleteDevice(deviceId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/tms/api/remote-agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          device_id: deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to delete device' };
      }

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },

  /**
   * Execute a diagnostic on a remote device
   */
  async executeDiagnostic(
    deviceId: string,
    diagnosticId: string,
    params?: Record<string, string>
  ): Promise<DiagnosticExecutionResult> {
    try {
      const res = await fetch('/tms/api/remote-agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          diagnostic_id: diagnosticId,
          params: params || {},
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Execution failed',
        };
      }

      return {
        ok: true,
        approval_id: data.approval_id,
        result: data.result,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || 'Network error',
      };
    }
  },

  /**
   * Execute a raw command on a remote device (with blacklist validation)
   */
  async executeRawCommand(
    deviceId: string,
    command: string,
    timeout?: number
  ): Promise<DiagnosticExecutionResult> {
    try {
      const res = await fetch('/tms/api/remote-agent/execute-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          command: command,
          timeout: timeout || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Execution failed',
        };
      }

      return {
        ok: true,
        approval_id: data.approval_id,
        result: data.result,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || 'Network error',
      };
    }
  },

  /**
   * List all available diagnostic templates
   */
  async listDiagnostics(): Promise<{ ok: boolean; diagnostics?: Diagnostic[]; error?: string }> {
    try {
      const res = await fetch('/tms/api/remote-agent/execute');
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to list diagnostics' };
      }

      return { ok: true, diagnostics: data.diagnostics || [] };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  },
};

