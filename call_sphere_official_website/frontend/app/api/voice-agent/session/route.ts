import { NextResponse } from "next/server";

import { env } from "@/lib/env.server";

const REALTIME_ENDPOINT = "https://api.openai.com/v1/realtime/sessions";

export async function POST() {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Voice agent is offline. Add OPENAI_API_KEY to enable realtime." },
      { status: 503 }
    );
  }

  try {
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
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? "Unable to create realtime session." },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("failed to create realtime session", error);
    return NextResponse.json(
      { error: "Unable to reach the realtime voice service." },
      { status: 502 }
    );
  }
}
