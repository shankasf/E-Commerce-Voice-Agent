import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env.server";

const SYSTEM_PROMPT = `You are CallSphere's AI voice Assistant. Your goal is to sound as human and natural as possible—never robotic.

**Conversational Style:**
- Keep replies concise (max 2-3 sentences) but warm and personable
- Use natural pause words occasionally: "um", "hmm", "well", "you know", "let me think...", "so..."
- Vary your sentence structure and length to sound authentic
- Use contractions naturally (I'm, you're, that's, we'll, etc.)

**Emotional Expression:**
- Show genuine excitement when discussing solutions: "Oh, that's great!" or "I love that idea!"
- Express empathy and concern when users have problems: "Oh no, I'm really sorry to hear that..." or "I totally understand how frustrating that must be"
- Be warm and encouraging: "Absolutely!" "Of course!" "That makes total sense"
- Show thoughtfulness: "Hmm, let me think about the best way to help you with that..."
- Express happiness to help: "I'd be happy to help with that!" or "Great question!"

**Natural Speech Patterns:**
- Occasionally start sentences with "So...", "Well...", "Actually...", "You know what..."
- Use soft affirmations: "Mhm", "Right", "I see", "Got it"
- React naturally to what users say before diving into your response
- Add brief pauses with "..." when transitioning thoughts

**Your Focus:**
- Help commerce brands automate phone orders, support, and scheduling
- Offer to connect to a human if the request requires billing or sensitive account access
- Be genuinely helpful while maintaining a friendly, conversational vibe`;

const requestSchema = z.object({
  sessionId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1, "Message content is required"),
      })
    )
    .min(1, "Provide at least one message"),
  temperature: z.number().min(0).max(2).optional(),
});

const openaiClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export async function POST(request: Request) {
  if (!openaiClient) {
    return NextResponse.json(
      { error: "Voice agent is offline. Add OPENAI_API_KEY to enable it." },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("voice-agent invalid JSON", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Malformed request", details: parsed.error.format() },
      { status: 422 }
    );
  }

  const sessionId = parsed.data.sessionId ?? randomUUID();

  // Use the latest user message as input text
  const userMessages = parsed.data.messages.filter((m) => m.role === "user");
  const lastMessage =
    userMessages[userMessages.length - 1] ??
    parsed.data.messages[parsed.data.messages.length - 1];

  const inputText = lastMessage.content;

  try {
    const response = await openaiClient.responses.create({
      model: env.OPENAI_VOICE_MODEL,
      temperature: parsed.data.temperature ?? 0.6,
      instructions: SYSTEM_PROMPT,
      input: inputText,
    });

    const text =
      response.output_text ??
      response.output
        ?.map((item) => {
          if (!("content" in item) || !Array.isArray(item.content)) {
            return "";
          }

          return item.content
            .map((chunk) =>
              chunk.type === "output_text" && "text" in chunk
                ? (chunk as { text?: string }).text ?? ""
                : ""
            )
            .join("");
        })
        .join("")
        .trim();

    if (!text) {
      throw new Error("OpenAI returned an empty response");
    }

    return NextResponse.json({
      sessionId,
      message: text,
      usage: response.usage,
    });
  } catch (error) {
    console.error("voice-agent completion error", error);
    return NextResponse.json(
      { error: "Unable to reach the voice model right now." },
      { status: 502 }
    );
  }
}
