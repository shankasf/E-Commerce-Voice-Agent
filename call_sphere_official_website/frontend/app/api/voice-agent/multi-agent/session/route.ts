import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env.server";

const REALTIME_ENDPOINT = "https://api.openai.com/v1/realtime/sessions";

// Sector-specific tool definitions
const SECTOR_TOOLS = {
  hvac: [
    {
      type: "function",
      name: "create_service_ticket",
      description: "Create a service ticket for HVAC repair or maintenance",
      parameters: {
        type: "object",
        properties: {
          issue_type: { type: "string", description: "Type of HVAC issue (heating, cooling, ventilation, thermostat)" },
          urgency: { type: "string", enum: ["routine", "urgent", "emergency"] },
          system_type: { type: "string", description: "Type of HVAC system (central AC, furnace, heat pump, mini-split)" },
          description: { type: "string", description: "Detailed description of the issue" },
        },
        required: ["issue_type", "description"],
      },
    },
    {
      type: "function",
      name: "schedule_maintenance",
      description: "Schedule routine HVAC maintenance or inspection",
      parameters: {
        type: "object",
        properties: {
          service_type: { type: "string", description: "Type of service (tune-up, inspection, filter change, duct cleaning)" },
          preferred_date: { type: "string" },
          preferred_time: { type: "string" },
        },
        required: ["service_type", "preferred_date"],
      },
    },
    {
      type: "function",
      name: "dispatch_technician",
      description: "Dispatch an HVAC technician for emergency or same-day service",
      parameters: {
        type: "object",
        properties: {
          issue_description: { type: "string" },
          time_window: { type: "string", description: "Preferred arrival time window" },
        },
        required: ["issue_description"],
      },
    },
  ],
  healthcare: [
    {
      type: "function",
      name: "book_appointment",
      description: "Book a medical appointment",
      parameters: {
        type: "object",
        properties: {
          appointment_type: { type: "string", description: "Type of appointment (checkup, consultation, follow-up)" },
          preferred_date: { type: "string" },
          preferred_time: { type: "string" },
          provider_preference: { type: "string" },
        },
        required: ["appointment_type", "preferred_date"],
      },
    },
    {
      type: "function",
      name: "verify_insurance",
      description: "Verify insurance coverage",
      parameters: {
        type: "object",
        properties: {
          insurance_provider: { type: "string" },
          member_id: { type: "string" },
        },
        required: ["insurance_provider"],
      },
    },
    {
      type: "function",
      name: "request_prescription_refill",
      description: "Request a prescription refill",
      parameters: {
        type: "object",
        properties: {
          medication_name: { type: "string" },
          pharmacy_preference: { type: "string" },
        },
        required: ["medication_name"],
      },
    },
  ],
  it_support: [
    {
      type: "function",
      name: "create_support_ticket",
      description: "Create an IT support ticket",
      parameters: {
        type: "object",
        properties: {
          issue_category: { type: "string", enum: ["hardware", "software", "network", "access", "other"] },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          description: { type: "string" },
        },
        required: ["issue_category", "description"],
      },
    },
    {
      type: "function",
      name: "check_ticket_status",
      description: "Check the status of an existing support ticket",
      parameters: {
        type: "object",
        properties: {
          ticket_id: { type: "string" },
        },
        required: ["ticket_id"],
      },
    },
    {
      type: "function",
      name: "request_password_reset",
      description: "Request a password reset for a user account",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string" },
          system: { type: "string", description: "Which system to reset password for" },
        },
        required: ["username"],
      },
    },
  ],
  logistics: [
    {
      type: "function",
      name: "track_order",
      description: "Track the status of an order or delivery",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          tracking_number: { type: "string" },
        },
      },
    },
    {
      type: "function",
      name: "schedule_redelivery",
      description: "Schedule a redelivery for a missed delivery",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          new_date: { type: "string" },
          new_time_window: { type: "string" },
        },
        required: ["order_id", "new_date"],
      },
    },
    {
      type: "function",
      name: "report_delivery_issue",
      description: "Report an issue with a delivery",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          issue_type: { type: "string", enum: ["damaged", "missing", "wrong_item", "late", "other"] },
          description: { type: "string" },
        },
        required: ["order_id", "issue_type"],
      },
    },
  ],
};

export async function POST(request: NextRequest) {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Voice agent is offline. Add OPENAI_API_KEY to enable realtime." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { sector } = body as { sector?: string };

    // Get sector-specific tools
    const sectorKey = sector?.toLowerCase().replace(/[^a-z]/g, "_").replace(/_+/g, "_") as keyof typeof SECTOR_TOOLS;
    const tools = SECTOR_TOOLS[sectorKey] || [];

    const response = await fetch(REALTIME_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: env.OPENAI_REALTIME_MODEL,
        voice: "alloy",
        tools: tools,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? "Unable to create realtime session." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ...payload,
      sector,
      tools: tools.map((t) => t.name),
    });
  } catch (error) {
    console.error("failed to create multi-agent realtime session", error);
    return NextResponse.json(
      { error: "Unable to reach the realtime voice service." },
      { status: 502 }
    );
  }
}
