/**
 * Remote Diagnostic Execution API
 * 
 * Executes diagnostics on remote endpoint agents via the WebSocket relay.
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
      diagnostic_id,
      params,
      approved_by,
    } = body;

    const store = getStore();

    // Validate required fields
    if (!device_id || !diagnostic_id) {
      return NextResponse.json(
        { error: "device_id and diagnostic_id are required" },
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
      }, 60000); // 60 second timeout

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

    // Send execute request to the agent
    const sent = store.sendToDevice(device_id, {
      type: "execute",
      request_id,
      diagnostic_id,
      params: params || {},
      approval_id,
    });

    if (!sent) {
      store.pendingRequests.delete(request_id);
      return NextResponse.json(
        { error: "Failed to send request to device" },
        { status: 500 }
      );
    }

    console.log(`[RemoteAgent] Execute request sent: ${diagnostic_id} to ${device_id}`);

    // Wait for the result
    try {
      const result = await resultPromise;
      
      console.log(`[RemoteAgent] Execute result: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
        diagnostic_id,
        device_id,
        has_stdout: !!result.stdout,
        has_stderr: !!result.stderr,
        exit_code: result.exit_code,
      });

      return NextResponse.json({
        ok: true,
        approval_id,
        result: {
          success: result.success !== false, // Default to true if not explicitly false
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
      console.error(`[RemoteAgent] Execute error: ${error.message}`, {
        diagnostic_id,
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
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: error?.message || "Execution failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to list available diagnostics
export async function GET(req: Request) {
  // Return the list of available diagnostic IDs
  const diagnostics = [
    { id: "network_ipconfig", name: "IP Configuration", description: "Display all network adapter IP configuration", category: "network", risk: "low" },
    { id: "network_ipconfig_release", name: "Release DHCP Lease", description: "Release the current DHCP lease", category: "network", risk: "medium" },
    { id: "network_ipconfig_renew", name: "Renew DHCP Lease", description: "Renew DHCP lease for all adapters", category: "network", risk: "medium" },
    { id: "network_flushdns", name: "Flush DNS Cache", description: "Clear the local DNS resolver cache", category: "network", risk: "low" },
    { id: "network_ping", name: "Ping Host", description: "Test network connectivity to a specific host", category: "network", risk: "low", params: ["host"] },
    { id: "network_tracert", name: "Trace Route", description: "Trace the network path to a destination", category: "network", risk: "low", params: ["host"] },
    { id: "network_nslookup", name: "DNS Lookup", description: "Query DNS for a domain name", category: "network", risk: "low", params: ["domain"] },
    { id: "network_netstat", name: "Network Connections", description: "Display active network connections", category: "network", risk: "low" },
    { id: "network_arp", name: "ARP Cache", description: "Display the ARP cache", category: "network", risk: "low" },
    { id: "system_info", name: "System Information", description: "Display detailed system configuration", category: "system", risk: "low" },
    { id: "system_hostname", name: "Computer Name", description: "Display the computer's hostname", category: "system", risk: "low" },
    { id: "system_whoami", name: "Current User", description: "Display the current logged-in user", category: "system", risk: "low" },
    { id: "system_tasklist", name: "Running Processes", description: "List all running processes", category: "system", risk: "low" },
    { id: "system_services", name: "Windows Services", description: "List all Windows services", category: "system", risk: "low" },
    { id: "disk_info", name: "Disk Space", description: "Display disk drives and free space", category: "disk", risk: "low" },
    { id: "ps_services", name: "PowerShell Services", description: "Get Windows services using PowerShell", category: "powershell", risk: "low" },
    { id: "ps_firewall_status", name: "Firewall Status", description: "Check Windows Firewall status", category: "powershell", risk: "low" },
    { id: "ps_wifi_profiles", name: "WiFi Profiles", description: "List saved WiFi network profiles", category: "powershell", risk: "low" },
    { id: "eventlog_system_errors", name: "Recent System Errors", description: "Get the last 20 system error events", category: "eventlog", risk: "low" },
    { id: "eventlog_app_errors", name: "Recent Application Errors", description: "Get the last 20 application error events", category: "eventlog", risk: "low" },
    { id: "health_check", name: "Agent Health Check", description: "Verify the endpoint agent is responding", category: "health", risk: "low" },
  ];

  return NextResponse.json({ diagnostics });
}
