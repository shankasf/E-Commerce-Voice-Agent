/**
 * Device Registration API
 * 
 * Handles device enrollment and management for remote endpoint agents.
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";

// Access the global store set up by server.js
function getStore() {
  return (global as any).remoteAgentStore || {
    devices: new Map(),
    generateEnrollmentCode: () => 'TEST-0000',
    saveDevices: () => {},
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;
    const store = getStore();

    switch (action) {
      case "create": {
        // Create a new device with enrollment code
        const { device_name, ticket_id, org_id } = body;
        
        if (!device_name) {
          return NextResponse.json(
            { error: "device_name is required" },
            { status: 400 }
          );
        }

        const device_id = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const enrollment_code = store.generateEnrollmentCode();
        
        const device = {
          device_id,
          device_name,
          org_id,
          ticket_id,
          enrollment_code,
          status: 'pending',
          connected: false,
          created_at: new Date().toISOString(),
        };

        store.devices.set(device_id, device);
        store.saveDevices();
        
        console.log(`[RemoteAgent] Device created: ${device_name} (${device_id}), code: ${enrollment_code}`);
        
        return NextResponse.json({
          ok: true,
          device: {
            device_id: device.device_id,
            device_name: device.device_name,
            enrollment_code: device.enrollment_code,
            status: device.status,
          },
          message: `Device created. Enrollment code: ${enrollment_code}`,
        });
      }

      case "disable": {
        // Disable a device (kill switch)
        const { device_id, reason } = body;
        
        if (!device_id) {
          return NextResponse.json(
            { error: "device_id is required" },
            { status: 400 }
          );
        }

        const device = store.devices.get(device_id);
        if (device) {
          device.status = 'disabled';
          store.saveDevices();
          console.log(`[RemoteAgent] Device disabled: ${device_id}, reason: ${reason}`);
        }
        
        return NextResponse.json({
          ok: true,
          message: "Device disabled",
        });
      }

      case "delete": {
        // Delete a device permanently
        const { device_id } = body;
        
        if (!device_id) {
          return NextResponse.json(
            { error: "device_id is required" },
            { status: 400 }
          );
        }

        const device = store.devices.get(device_id);
        if (!device) {
          return NextResponse.json(
            { error: "Device not found" },
            { status: 404 }
          );
        }

        // Disconnect device if connected
        if (store.deviceConnections && store.deviceConnections.has(device_id)) {
          const ws = store.deviceConnections.get(device_id);
          if (ws && ws.readyState === 1) { // WebSocket.OPEN
            ws.close();
          }
          store.deviceConnections.delete(device_id);
        }

        // Remove device from store
        store.devices.delete(device_id);
        store.saveDevices();
        
        console.log(`[RemoteAgent] Device deleted: ${device_id}`);
        
        return NextResponse.json({
          ok: true,
          message: "Device deleted",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Device registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Registration failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticket_id");
    const deviceId = searchParams.get("device_id");

    // Get single device by ID
    if (deviceId) {
      const device = store.devices.get(deviceId);
      if (!device) {
        return NextResponse.json(
          { error: "Device not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ 
        device: {
          device_id: device.device_id,
          device_name: device.device_name,
          ticket_id: device.ticket_id,
          org_id: device.org_id,
          status: device.status,
          connected: device.connected,
          last_seen: device.last_seen,
          enrollment_code: device.status === 'pending' ? device.enrollment_code : undefined,
        }
      });
    }

    // Get devices for a specific ticket
    if (ticketId) {
      const ticketIdNum = parseInt(ticketId);
      const devices = Array.from(store.devices.values())
        .filter((d: any) => d.ticket_id === ticketIdNum);
      return NextResponse.json({ 
        devices: devices.map((d: any) => ({
          device_id: d.device_id,
          device_name: d.device_name,
          ticket_id: d.ticket_id,
          status: d.status,
          connected: d.connected,
          last_seen: d.last_seen,
          enrollment_code: d.status === 'pending' ? d.enrollment_code : undefined,
        }))
      });
    }

    // Get all devices
    const devices = Array.from(store.devices.values());
    return NextResponse.json({
      devices: devices.map((d: any) => ({
        device_id: d.device_id,
        device_name: d.device_name,
        ticket_id: d.ticket_id,
        org_id: d.org_id,
        status: d.status,
        connected: d.connected,
        last_seen: d.last_seen,
        enrollment_code: d.status === 'pending' ? d.enrollment_code : undefined,
      })),
    });
  } catch (error: any) {
    console.error("Device list error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list devices" },
      { status: 500 }
    );
  }
}
