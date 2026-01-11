/**
 * Raw Command Execution API
 * 
 * Executes raw commands on remote endpoint agents via the WebSocket relay.
 * Uses blacklist approach - allows all commands except dangerous ones.
 * Requires approval verification before execution.
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";

// Access the global store set up by server.js
function getStore() {
  return (global as any).remoteAgentStore || {
    devices: new Map(),
    pendingRequests: new Map(),
    sendToDevice: () => false,
    isDeviceOnline: () => false,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ticket_id,
      device_id,
      command,
      timeout,
      approved_by,
    } = body;

    const store = getStore();

    // Validate required fields
    if (!device_id || !command) {
      return NextResponse.json(
        { error: "device_id and command are required" },
        { status: 400 }
      );
    }

    // Validate command is not empty
    if (!command.trim()) {
      return NextResponse.json(
        { error: "Command cannot be empty" },
        { status: 400 }
      );
    }

    // Check if device exists
    const device = store.devices.get(device_id);
    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Check if device is disabled
    if (device.status === 'disabled') {
      return NextResponse.json(
        { error: "Device has been disabled" },
        { status: 403 }
      );
    }

    // Check if device is online
    if (!store.isDeviceOnline(device_id)) {
      return NextResponse.json(
        { error: "Device is offline", connected: false },
        { status: 503 }
      );
    }

    // Generate request ID
    const request_id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const approval_id = `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a promise that will be resolved when the agent responds
    const resultPromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        store.pendingRequests.delete(request_id);
        reject(new Error("Request timed out (60s)"));
      }, (timeout || 60) * 1000); // Use provided timeout or default 60s

      store.pendingRequests.set(request_id, { 
        resolve: (result: any) => {
          clearTimeout(timeout);
          store.pendingRequests.delete(request_id);
          resolve(result);
        }, 
        reject,
        timeout 
      });
    });

    // Send execute_raw request to the agent
    const sent = store.sendToDevice(device_id, {
      type: "execute_raw",
      request_id,
      command: command.trim(),
      timeout: timeout || 30,
      approval_id,
    });

    if (!sent) {
      store.pendingRequests.delete(request_id);
      return NextResponse.json(
        { error: "Failed to send request to device" },
        { status: 500 }
      );
    }

    console.log(`[RemoteAgent] Execute raw request sent: "${command}" to ${device_id}`);

    // Wait for the result
    try {
      const result = await resultPromise;
      
      console.log(`[RemoteAgent] Execute raw result: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
        command,
        device_id,
        has_stdout: !!result.stdout,
        has_stderr: !!result.stderr,
        exit_code: result.exit_code,
        blocked: result.error?.includes('blocked') || false,
      });

      return NextResponse.json({
        ok: result.success !== false && !result.error?.includes('blocked'),
        approval_id,
        result: {
          success: result.success !== false && !result.error?.includes('blocked'),
          stdout: result.stdout || "",
          stderr: result.stderr || "",
          exit_code: result.exit_code ?? (result.success === false ? 1 : 0),
          truncated: result.truncated || false,
          redactions: result.redactions || 0,
          warnings: result.warnings || [],
          execution_time_ms: result.execution_time_ms || 0,
          error: result.error || undefined,
        },
      });
    } catch (error: any) {
      console.error(`[RemoteAgent] Execute raw error: ${error.message}`, {
        command,
        device_id,
        request_id,
      });

      return NextResponse.json(
        { 
          ok: false,
          error: error.message || "Execution failed",
          result: null,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Execute raw error:", error);
    return NextResponse.json(
      { error: error?.message || "Execution failed" },
      { status: 500 }
    );
  }
}

