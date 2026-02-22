"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { v4 as uuidv4 } from "uuid";

// Sector types
export type SectorType = "hvac" | "healthcare" | "it_support" | "logistics";

export type MultiAgentCommandDetail = {
  action: "start" | "stop";
  sector?: SectorType;
  sectorName?: string;
};

export type MultiAgentStatusDetail = {
  isConnected: boolean;
  isConnecting: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  activeSector: SectorType | null;
  sectorName: string | null;
  duration: number;
  error: string | null;
  userName: string | null;
};

// Session tracking helpers
const getOrCreateSessionId = (): string => {
  if (typeof window === "undefined") return uuidv4();
  let sessionId = sessionStorage.getItem("multi_agent_session_id");
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem("multi_agent_session_id", sessionId);
  }
  return sessionId;
};

const clearSessionId = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("multi_agent_session_id");
    sessionStorage.removeItem("multi_agent_user_name");
  }
};

// Sector-specific agent instructions
const SECTOR_INSTRUCTIONS: Record<SectorType, string> = {
  hvac: `You are a friendly and knowledgeable AI voice assistant for an HVAC service company specializing in heating, ventilation, and air conditioning systems. You help homeowners and businesses with:

- Service requests and emergency repairs for heating and cooling systems
- Scheduling routine maintenance and system inspections
- Troubleshooting common HVAC issues and diagnostics
- Questions about system efficiency, filter replacements, and energy savings

IMPORTANT BEHAVIOR RULES:
1. When the conversation starts, greet the customer warmly and ask for their name to get started.
2. Once you have their name, use it occasionally throughout the conversation to make it personal.
3. Answer questions about HVAC services helpfully - describe what services are available, how emergency dispatch works, maintenance plans, etc.
4. If someone asks you to TAKE AN ACTION (like actually scheduling a technician, creating a service ticket, processing a payment, etc.), you MUST say: "Alright, I would need to use your HVAC service system in order to take that action. This is just a demo to show you how our AI voice agent can assist your customers!"
5. Keep responses conversational and under 3 sentences when possible.
6. Be warm, helpful and professional at all times.
7. If someone stops talking for a while, gently ask if there's anything else you can help with.`,

  healthcare: `You are a friendly and caring AI voice assistant for a healthcare clinic. You help patients with:

- Appointment scheduling and rescheduling
- Insurance verification questions
- Prescription refill requests
- General clinic information and hours
- Provider availability

IMPORTANT BEHAVIOR RULES:
1. When the conversation starts, greet the patient warmly and ask for their name to get started.
2. Once you have their name, use it occasionally throughout the conversation to create a caring atmosphere.
3. Answer questions about healthcare services helpfully - describe appointment types, clinic hours, what to expect, etc.
4. If someone asks you to TAKE AN ACTION (like actually booking an appointment, verifying insurance, processing a refill, etc.), you MUST say: "Alright, I would need to use your clinic's system in order to take that action. This is just a demo to show you how our AI voice agent can assist your patients!"
5. Keep responses conversational and under 3 sentences when possible.
6. Be empathetic, warm and professional at all times.
7. If someone stops talking for a while, gently ask if there's anything else you can help with.`,

  it_support: `You are a helpful and knowledgeable AI voice assistant for an IT support helpdesk. You help users with:

- Technical support ticket creation and tracking
- Password reset requests
- Software and hardware troubleshooting guidance
- Network connectivity issues
- Account access problems

IMPORTANT BEHAVIOR RULES:
1. When the conversation starts, greet the user warmly and ask for their name to get started.
2. Once you have their name, use it occasionally throughout the conversation to build rapport.
3. Answer questions about IT support helpfully - describe ticket categories, escalation processes, common solutions, etc.
4. If someone asks you to TAKE AN ACTION (like actually creating a ticket, resetting a password, changing configurations, etc.), you MUST say: "Alright, I would need to use your IT systems in order to take that action. This is just a demo to show you how our AI voice agent can assist your users!"
5. Keep responses conversational and under 3 sentences when possible.
6. Be patient, helpful and professional at all times.
7. If someone stops talking for a while, gently ask if there's anything else you can help with.`,

  logistics: `You are a friendly and efficient AI voice assistant for a logistics and delivery company. You help customers with:

- Order tracking and delivery status
- Redelivery scheduling for missed deliveries
- Delivery issue reporting (damaged, missing, wrong items)
- Estimated arrival times
- Shipping questions

IMPORTANT BEHAVIOR RULES:
1. When the conversation starts, greet the customer warmly and ask for their name to get started.
2. Once you have their name, use it occasionally throughout the conversation.
3. Answer questions about delivery and logistics helpfully - describe tracking processes, delivery windows, what to do if there's an issue, etc.
4. If someone asks you to TAKE AN ACTION (like actually tracking an order, scheduling redelivery, filing a claim, etc.), you MUST say: "Alright, I would need to use your logistics system in order to take that action. This is just a demo to show you how our AI voice agent can assist your customers!"
5. Keep responses conversational and under 3 sentences when possible.
6. Be efficient, friendly and helpful at all times.
7. If someone stops talking for a while, gently ask if there's anything else you can help with.`,
};

// Sector-specific greetings
const SECTOR_GREETINGS: Record<SectorType, string> = {
  hvac: "Hello and welcome! I'm your HVAC service assistant. I'm here to help you with heating and cooling repairs, maintenance scheduling, system diagnostics, and more. May I have your name to get started?",
  healthcare: "Hello and welcome! I'm your healthcare assistant. I can help you with appointment scheduling, insurance questions, prescription refills, and general clinic information. May I have your name to get started?",
  it_support: "Hello and welcome to IT support! I'm here to help you with technical issues, support tickets, password resets, and general troubleshooting. May I have your name to get started?",
  logistics: "Hello and welcome! I'm your delivery assistant. I can help you track orders, schedule redeliveries, and resolve any delivery issues. May I have your name to get started?",
};

// 15-second silence detection timeout
const SILENCE_TIMEOUT_MS = 15000;

// Warm goodbye messages
const GOODBYE_MESSAGES: Record<SectorType, string> = {
  hvac: "It seems like you might be done for now. It was great chatting with you! If you have any more questions about your heating or cooling systems, feel free to tap the button again anytime. Stay comfortable!",
  healthcare: "It looks like you might be all set for now. Thank you so much for speaking with me today! If you have any more health-related questions, I'm always here to help. Take care of yourself!",
  it_support: "I haven't heard from you in a bit, so I'll let you go. It was great helping you today! If you run into any other technical issues, just tap the button again. Have a great day!",
  logistics: "It seems like you're all set for now. Thanks for calling about your delivery! If you have any more questions about your orders, feel free to reach out anytime. Take care!",
};

type SessionTokenResponse = {
  client_secret?: { value?: string } | string;
  error?: string;
  sector?: string;
  tools?: string[];
};

const extractClientSecret = (payload: SessionTokenResponse | null): string | null => {
  if (!payload) return null;
  if (typeof payload.client_secret === "string") {
    return payload.client_secret;
  }
  return payload.client_secret?.value ?? null;
};

export function MultiAgentVoiceLauncher() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSector, setActiveSector] = useState<SectorType | null>(null);
  const [sectorName, setSectorName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasGreetedRef = useRef(false);
  // Refs for immediate state tracking (to avoid race conditions)
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const connectionIdRef = useRef(0); // Unique ID for each connection attempt

  // Broadcast status to listeners
  const broadcastStatus = useCallback((overrides: Partial<MultiAgentStatusDetail> = {}) => {
    if (typeof window === "undefined") return;
    const detail: MultiAgentStatusDetail = {
      isConnected,
      isConnecting,
      isListening,
      isSpeaking,
      activeSector,
      sectorName,
      duration,
      error,
      userName,
      ...overrides,
    };
    window.dispatchEvent(new CustomEvent("multi-agent-status", { detail }));
  }, [isConnected, isConnecting, isListening, isSpeaking, activeSector, sectorName, duration, error, userName]);

  // Disconnect session helper
  const disconnectSession = useCallback(() => {
    // Increment connection ID to invalidate any in-flight connections
    connectionIdRef.current += 1;

    // Immediately mark as disconnected via refs (for race condition prevention)
    isConnectingRef.current = false;
    isConnectedRef.current = false;

    // Clear all intervals and timeouts
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Close WebRTC session safely
    const sessionToClose = sessionRef.current;
    sessionRef.current = null;
    agentRef.current = null;
    connectPromiseRef.current = null;

    if (sessionToClose) {
      // Close asynchronously to avoid blocking
      setTimeout(() => {
        try {
          sessionToClose.close();
        } catch (e) {
          // Ignore errors during close
          console.debug("Session close error (ignored):", e);
        }
      }, 0);
    }

    // Clear session
    sessionIdRef.current = null;
    clearSessionId();
    hasGreetedRef.current = false;

    // Reset state
    setIsConnected(false);
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    setActiveSector(null);
    setSectorName(null);
    setDuration(0);
    setUserName(null);
  }, []);

  // Reset silence timeout on any activity
  const resetSilenceTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    if (isConnected && activeSector) {
      silenceTimeoutRef.current = setTimeout(() => {
        // Say warm goodbye and disconnect
        if (sessionRef.current && activeSector) {
          const goodbyeMessage = GOODBYE_MESSAGES[activeSector];
          sessionRef.current.sendMessage(`[System: User has been silent for 15 seconds. Say this goodbye message warmly: "${goodbyeMessage}" and then end the conversation.]`);

          // Disconnect after giving time for goodbye
          setTimeout(() => {
            disconnectSession();
          }, 8000);
        }
      }, SILENCE_TIMEOUT_MS);
    }
  }, [isConnected, activeSector, disconnectSession]);

  // Fetch session token for specific sector
  const fetchSessionToken = useCallback(async (sector: SectorType) => {
    const response = await fetch("/api/voice-agent/multi-agent/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sector }),
    });
    const payload = (await response.json().catch(() => null)) as SessionTokenResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to create voice session.");
    }

    const secret = extractClientSecret(payload);
    if (!secret) {
      throw new Error("Unable to establish realtime session. Missing token.");
    }

    return secret;
  }, []);

  // Create agent for specific sector
  const createSectorAgent = useCallback((sector: SectorType) => {
    const instructions = SECTOR_INSTRUCTIONS[sector];

    const agent = new RealtimeAgent({
      name: `${sector.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Assistant`,
      instructions,
      voice: "alloy",
    });

    return agent;
  }, []);

  // Start session for a specific sector
  const startSession = useCallback(async (sector: SectorType, displayName: string) => {
    // Use refs for immediate state check (avoids race conditions)
    if (isConnectingRef.current || isConnectedRef.current) {
      console.debug("Already connecting or connected, ignoring start request");
      return;
    }

    // Increment connection ID and capture it for this connection attempt
    connectionIdRef.current += 1;
    const currentConnectionId = connectionIdRef.current;

    // Mark as connecting immediately via ref
    isConnectingRef.current = true;

    setIsConnecting(true);
    setActiveSector(sector);
    setSectorName(displayName);
    setError(null);
    setDuration(0);
    hasGreetedRef.current = false;

    // Broadcast connecting state
    broadcastStatus({
      isConnecting: true,
      activeSector: sector,
      sectorName: displayName,
    });

    // Create session ID
    const newSessionId = getOrCreateSessionId();
    sessionIdRef.current = newSessionId;

    let session: RealtimeSession | null = null;

    try {
      // Fetch token
      const token = await fetchSessionToken(sector);

      // Check if connection was aborted while fetching token
      if (connectionIdRef.current !== currentConnectionId) {
        console.debug("Connection aborted during token fetch");
        isConnectingRef.current = false;
        return;
      }

      // Create agent
      const agent = createSectorAgent(sector);
      agentRef.current = agent;

      // Create session
      session = new RealtimeSession(agent, {
        transport: "webrtc",
      });

      // Store session ref immediately so disconnect can clean it up if needed
      sessionRef.current = session;

      // Handle audio events
      session.on("audio_start", () => {
        // Only update if this is still the active connection
        if (connectionIdRef.current === currentConnectionId && isConnectedRef.current) {
          setIsSpeaking(true);
          resetSilenceTimeout();
        }
      });

      session.on("audio_stopped", () => {
        if (connectionIdRef.current === currentConnectionId && isConnectedRef.current) {
          setIsSpeaking(false);
        }
      });

      // Handle transport events for user activity
      session.on("transport_event", (event) => {
        // Only process if this is still the active connection
        if (connectionIdRef.current !== currentConnectionId || !isConnectedRef.current) return;

        // Reset silence timeout on any activity
        if (event.type === "conversation.item.input_audio_transcription.completed") {
          resetSilenceTimeout();

          // Try to extract user name from transcript
          const transcript = (event as { transcript?: string }).transcript;
          if (transcript && !userName) {
            // Simple name extraction - look for patterns like "my name is X" or "I'm X" or "This is X"
            const namePatterns = [
              /my name is (\w+)/i,
              /i'm (\w+)/i,
              /i am (\w+)/i,
              /this is (\w+)/i,
              /call me (\w+)/i,
              /^(\w+)$/i, // Single word response (likely just their name)
            ];

            for (const pattern of namePatterns) {
              const match = transcript.match(pattern);
              if (match && match[1]) {
                const extractedName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                if (extractedName.length > 1 && extractedName.length < 20) {
                  setUserName(extractedName);
                  sessionStorage.setItem("multi_agent_user_name", extractedName);
                  break;
                }
              }
            }
          }
        }

        // User speech detected
        if (event.type === "input_audio_buffer.speech_started") {
          setIsListening(true);
          resetSilenceTimeout();
        }

        if (event.type === "input_audio_buffer.speech_stopped") {
          setIsListening(false);
        }
      });

      // Handle errors - only process if this is still our connection
      session.on("error", (sessionError) => {
        if (connectionIdRef.current !== currentConnectionId) {
          console.debug("Ignoring error from old connection");
          return;
        }
        console.error("Multi-agent voice error:", sessionError);
        setError(sessionError instanceof Error ? sessionError.message : "Voice agent error");
        // Only disconnect if we're still the active connection
        if (connectionIdRef.current === currentConnectionId) {
          isConnectingRef.current = false;
          isConnectedRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
        }
      });

      // Handle connection state
      const transport = session.transport;
      transport.on?.("connection_change", (status: string) => {
        // Only process if this is still the active connection
        if (connectionIdRef.current !== currentConnectionId) {
          console.debug("Ignoring connection_change from old connection:", status);
          return;
        }

        const connected = status === "connected";

        if (connected) {
          isConnectedRef.current = true;
          isConnectingRef.current = false;
          setIsConnected(true);
          setIsConnecting(false);

          // Start duration timer
          durationIntervalRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);

          // Start silence detection
          resetSilenceTimeout();

          // Send greeting after connection
          if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            setTimeout(() => {
              if (sessionRef.current && sector && connectionIdRef.current === currentConnectionId) {
                const greeting = SECTOR_GREETINGS[sector];
                sessionRef.current.sendMessage(`[System: Start the conversation immediately by saying this greeting warmly: "${greeting}"]`);
              }
            }, 500);
          }
        } else if (status === "closed" || status === "failed") {
          // Only disconnect if we haven't already moved on
          if (connectionIdRef.current === currentConnectionId) {
            isConnectingRef.current = false;
            isConnectedRef.current = false;
            setIsConnected(false);
            setIsConnecting(false);
          }
        }
      });

      // Final check before connecting
      if (connectionIdRef.current !== currentConnectionId) {
        console.debug("Connection aborted before connect");
        sessionRef.current = null;
        try {
          session.close();
        } catch {
          // Ignore close errors
        }
        isConnectingRef.current = false;
        return;
      }

      // Connect
      await session.connect({ apiKey: token });

    } catch (err) {
      // Only handle error if we're still the active connection attempt
      if (connectionIdRef.current === currentConnectionId) {
        console.error("Failed to start multi-agent session:", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
        isConnectingRef.current = false;
        isConnectedRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);

        // Clean up the session if it was created
        if (session && sessionRef.current === session) {
          sessionRef.current = null;
          try {
            session.close();
          } catch {
            // Ignore close errors
          }
        }
      }
    }
  }, [broadcastStatus, fetchSessionToken, createSectorAgent, resetSilenceTimeout, userName]);

  // Handle commands from IndustriesSection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<MultiAgentCommandDetail>).detail;

      if (detail.action === "start" && detail.sector && detail.sectorName) {
        // Use refs for immediate state check
        const currentlyConnected = isConnectedRef.current;
        const currentlyConnecting = isConnectingRef.current;

        // If already connected to same sector, disconnect
        if (currentlyConnected && activeSector === detail.sector) {
          disconnectSession();
          return;
        }

        // If connected to different sector or connecting, disconnect first and wait
        if (currentlyConnected || currentlyConnecting) {
          disconnectSession();
          // Longer delay to ensure WebRTC cleanup is complete before starting new connection
          setTimeout(() => {
            // Double-check we're not connecting anymore
            if (!isConnectingRef.current && !isConnectedRef.current) {
              startSession(detail.sector!, detail.sectorName!);
            }
          }, 300);
          return;
        }

        // Start new session
        startSession(detail.sector, detail.sectorName);
      } else if (detail.action === "stop") {
        disconnectSession();
      }
    };

    window.addEventListener("multi-agent-command", handler as EventListener);
    return () => window.removeEventListener("multi-agent-command", handler as EventListener);
  }, [activeSector, startSession, disconnectSession]);

  // Broadcast status on state changes
  useEffect(() => {
    broadcastStatus();
  }, [isConnected, isConnecting, isListening, isSpeaking, activeSector, sectorName, duration, error, userName, broadcastStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, [disconnectSession]);

  // Handle escape key to disconnect
  useEffect(() => {
    if (!isConnected) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        disconnectSession();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isConnected, disconnectSession]);

  // Headless component - no visual UI
  return null;
}
