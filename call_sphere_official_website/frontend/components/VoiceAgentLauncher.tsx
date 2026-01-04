"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { v4 as uuidv4 } from "uuid";

export type VoiceAgentCommandDetail = {
  action?: "toggle" | "start" | "stop";
};

// Session tracking helpers
const getOrCreateSessionId = (): string => {
  if (typeof window === "undefined") return uuidv4();

  let sessionId = sessionStorage.getItem("voice_agent_session_id");
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem("voice_agent_session_id", sessionId);
  }
  return sessionId;
};

const clearSessionId = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("voice_agent_session_id");
  }
};

const getUTMParams = () => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
    landingPage: window.location.pathname,
    referrer: document.referrer || undefined,
  };
};

type VoiceAgentStatusDetail = {
  isOpen: boolean;
  isListening: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  isDisconnecting: boolean;
  hasError: boolean;
};

type SessionTokenResponse = {
  client_secret?: { value?: string } | string;
  error?: string;
};

declare global {
  interface Window {
    __voiceAgentReady?: boolean;
    __voiceAgentCommandQueue?: VoiceAgentCommandDetail[];
  }
}

const CALLSPHERE_RAG_REFERENCE = `# CallSphere: AI-Powered Agentic Voice and Chat Agents for Enterprise Automation

## Company Overview

CallSphere LLC is an enterprise automation platform headquartered at 27 Orchard Pl, New York, NY. The company specializes in deploying intelligent agentic systems that automate customer interactions across voice and text channels. CallSphere's core mission is to transform inbound communications into completed transactions, resolved support cases, and scheduled services through orchestrated AI agents that work seamlessly across multiple channels.

The company operates 24/7 with live worldwide coverage, ensuring that businesses can automate their customer interactions regardless of timezone or volume. CallSphere's team is available 9am - 7pm ET for consultation and implementation support, with voice agents operating continuously to handle customer needs.

Contact information: Email sagar@callsphere.tech, Phone (845) 388-4261.

## Core Product Offerings: Agentic Voice Agents and Agentic Chatbot Agents

CallSphere offers two complementary agentic automation products that work together to provide comprehensive customer interaction coverage: agentic voice agents and agentic chatbot agents.

### Agentic Voice Agents

Agentic voice agents represent CallSphere's flagship offering. These AI-powered voice systems orchestrate the complete customer journey from initial intent understanding through transaction completion. The voice agents handle catalog search, cart building, PCI-compliant checkout, and follow-up communications in a single seamless conversation with no hold music or handoffs.

Voice agents are designed to close the loop on three critical business processes: order placement and checkout, customer support and issue resolution, and appointment scheduling with reminders. The agents intelligently understand customer intent, query product catalogs semantically, apply relevant filters based on brand, size, price, and availability, build shopping carts, process payments securely, and confirm transactions via SMS or email.

### Agentic Chatbot Agents

Complementing the voice agents, CallSphere's agentic chatbot agents provide text-based intelligent automation for customers who prefer written communication or need asynchronous interaction. These chatbot agents use the same underlying orchestration engine as the voice agents, enabling businesses to offer consistent, intelligent automation across both voice and text channels.

Agentic chatbot agents handle product discovery and recommendations through conversational interfaces, process orders and payments via secure chat protocols, manage customer support tickets and issue tracking, schedule and reschedule appointments, provide real-time order status updates, and escalate complex issues to human agents when necessary. The chatbots maintain conversation context, learn from interactions, and provide personalized responses based on customer history and preferences.

## Key Capabilities and Features

Both agentic voice and chatbot agents share a unified set of capabilities that enable comprehensive business automation.

### Zero-Code Journey Builder with Guardrails

CallSphere provides a zero-code interface for designing customer interaction workflows. Business teams can configure agent behavior, define conversation flows, set business rules, and establish escalation paths without requiring technical expertise or code changes. The platform includes built-in guardrails to ensure agents stay within defined boundaries, maintain brand voice, and handle edge cases appropriately.

### PCI-Compliant Payment Processing and PII Vaulting

Both voice and chatbot agents handle payment information securely through PCI-compliant handoff mechanisms to providers like Stripe and Square. Personal identifying information is vaulted securely with encryption, audit logging, and role-based access controls. The agents never store sensitive data locally, ensuring compliance with industry regulations and data protection standards.

### Real-Time Analytics and Workflow Insights

CallSphere provides comprehensive analytics dashboards that surface bottlenecks, drop-off points, and optimization opportunities. Analytics include heatmaps showing where conversations stall, topic modeling to identify common customer concerns, and CSAT (Customer Satisfaction) insights to measure agent effectiveness. Operators can instantly identify which workflows need improvement and track the impact of changes.

### Omnichannel Integration

Customers can initiate conversations through their preferred channel—voice, SMS, WhatsApp, or web chat—and agents seamlessly continue the interaction across channels. If a voice call needs to transition to text, or a chat needs escalation to voice, the agent maintains context and conversation history throughout.

### Secure and Compliant Architecture

The platform includes PII vaulting to protect customer data, comprehensive audit logs for compliance tracking, and role-based access controls to restrict sensitive operations. Organizations maintain full visibility into agent actions and customer interactions for regulatory compliance and quality assurance.

## Industry-Specific Applications

CallSphere's agentic voice and chatbot agents are purpose-built for industries with high-volume customer interactions and complex transaction requirements.

### Retail and Grocery

In retail and grocery environments, agentic agents handle live inventory lookups, suggest backorder alternatives when items are unavailable, and process loyalty program lookups. Voice agents enable customers to call and complete orders while chatbot agents let customers browse and purchase via text. Both agents access real-time inventory systems and can coordinate curbside pickup or delivery logistics.

### Restaurants and Food Service

Restaurant agents handle dynamic menu management, process phone orders with modifications, suggest upsells based on customer preferences, and manage table reservations. Voice agents let customers call to order while chatbot agents enable online ordering through messaging apps. Agents can confirm special requests, dietary restrictions, and delivery addresses in real-time.

### Pharmacy and Healthcare

Pharmacy agents manage prescription refills, send medication reminders, verify customer information (DOB and zip code), and schedule pickup times. Both voice and chatbot agents ensure HIPAA compliance while automating routine interactions. Agents can identify when customers need to speak with a pharmacist and route accordingly.

### Professional Services and Field Services

Service-based businesses use agents to handle intelligent routing to appropriate technicians, process booking requests, suggest add-on services, and schedule field technician appointments. Voice agents handle complex scheduling conversations while chatbot agents enable customers to self-service simple requests.

## How Agentic Agents Work: Three-Step Process

The orchestration of both voice and chatbot agents follows a consistent three-step workflow that ensures consistent customer experience across channels.

### Step One: Discover

The agent listens to or reads the customer's initial request and understands their intent. The agent queries the product catalog semantically, meaning it understands meaning rather than just matching keywords. For voice agents, this involves natural language understanding of spoken requests. For chatbot agents, this involves parsing written input and understanding context from conversation history.

### Step Two: Decide

Once the agent understands intent, it applies relevant filters and constraints. For a grocery customer, this might mean filtering products by dietary restrictions or price range. For a restaurant customer, this means applying availability constraints and special request handling. For a pharmacy customer, this means checking refill eligibility and insurance coverage. The agent builds a cart or proposal based on these decisions.

### Step Three: Complete

The agent processes the transaction, handles payment through secure channels, and confirms completion. For voice agents, this means reading back the order and sending SMS confirmation. For chatbot agents, this means displaying order summary and sending email confirmation. Both agents provide tracking information and escalation paths for follow-up questions.

## Integration Ecosystem

CallSphere agents integrate seamlessly with the business systems and platforms companies already rely on, eliminating the need for rip-and-replace implementations.

### Telephony and Commerce Integrations

Voice agents integrate with Twilio for call routing and management. Both agents integrate with major commerce platforms including Shopify for e-commerce, WooCommerce for WordPress-based stores, Stripe for payment processing, and Square for point-of-sale systems. This enables agents to access product catalogs, process payments, and update order systems in real-time.

### Data and Storage Integrations

Agents access customer data and product information from vector databases including Weaviate, Milvus, and Qdrant for semantic search capabilities. Structured data is stored in Postgres databases that agents query for inventory, pricing, and customer information.

### CRM and Support Integrations

Agents integrate with HubSpot for customer relationship management, Zendesk for support ticket creation and management, Freshdesk for helpdesk operations, and Salesforce for enterprise CRM systems. This enables agents to access customer history, create support tickets, and update customer records automatically.

## Proven Results and Performance Metrics

CallSphere's agentic agents deliver measurable business outcomes across customer interaction metrics.

### Order Completion and Conversion

Businesses deploying CallSphere agents achieve a 92% closure rate on orders initiated through voice or chat channels. This means that 92% of customer interactions that involve ordering result in completed transactions without human intervention. This represents a significant improvement over traditional phone systems where customers frequently abandon calls or require multiple interactions.

### Operational Efficiency

Average agent handling time decreases by 35% when deploying CallSphere agents. This reduction comes from agents' ability to process information faster than humans, eliminate hold times and transfers, and handle multiple tasks in parallel. Customers complete transactions in a single interaction rather than requiring callbacks or follow-ups.

### Automation Coverage

CallSphere agents resolve 91% of tier-one queries without human escalation. Tier-one queries are routine, common customer requests like order status checks, simple product questions, and appointment scheduling. By automating these high-volume, low-complexity interactions, human agents can focus on complex issues requiring judgment and empathy.

### Order Completion Speed

Businesses report 42% faster order completion on average across retail and restaurant deployments. This speed improvement comes from agents' ability to instantly access inventory, pricing, and customer information, process decisions without delays, and confirm transactions immediately.

## Pricing and Plans

CallSphere offers three pricing tiers designed to scale with business volume and requirements. All plans include PCI-compliant payment handoff and real-time analytics as standard features.

### Starter Plan

The Starter plan costs $149 per month and supports up to 2,000 calls or chat interactions per month with one phone number or chat channel. Included features are voice agent setup for basic ordering flows, order and support automation capabilities, and email summaries of daily activity. This plan is ideal for small businesses testing agent automation or handling overflow traffic.

### Growth Plan

The Growth plan costs $499 per month and supports up to 10,000 calls or chat interactions per month with three phone numbers or chat channels. Advanced analytics features provide detailed insights into agent performance and customer behavior. CRM and helpdesk integration enables agents to access customer history and create support tickets. Live call monitoring allows supervisors to listen to and evaluate agent interactions in real-time. Customer data vaulting securely stores customer information for personalization. This plan is popular with mid-market businesses scaling agent automation across multiple channels.

### Scale Plan

The Scale plan costs $1,499 per month and supports up to 50,000 calls or chat interactions per month with ten phone numbers or chat channels. A dedicated Customer Success Manager provides strategic guidance and optimization. Single Sign-On (SSO) and role-based access controls enable enterprise security. Priority routing and intelligent queueing ensure high-priority customers receive immediate attention. Custom reporting provides business-specific metrics and KPIs. This plan serves enterprise organizations with high-volume interactions and complex requirements.

Annual billing is available across all plans with a 15% discount, reducing costs for businesses committing to long-term agent automation.

## Customer Testimonials and Trust

Organizations across industries trust CallSphere to automate their customer interactions and improve business outcomes.

One D2C (direct-to-consumer) retailer reports: "We closed more orders from phone traffic than ever." This reflects the dramatic improvement in conversion rates when deploying intelligent voice agents.

An operations leader notes: "Setup took a day; our team loves the analytics." This highlights both the ease of implementation and the value of real-time insights into agent performance.

A store owner states: "Customers finish in one call. That's the win." This encapsulates the core value proposition—customers complete their interactions without transfers, holds, or callbacks.

## Frequently Asked Questions

### How do you handle payments?

CallSphere agents process payments through secure handoff to PCI-compliant providers such as Stripe or Square. The agents collect payment information through voice (for voice agents) or secure chat interfaces (for chatbot agents), validate the information, and transmit it directly to payment processors. CallSphere never stores payment card data, ensuring compliance with PCI DSS standards.

### Do you integrate with my catalog?

Yes. CallSphere agents integrate with product catalogs from e-commerce platforms like Shopify and WooCommerce, point-of-sale systems like Square, and custom databases via API connections. The agents access real-time inventory, pricing, and product information to provide accurate recommendations and availability status.

### Is my data safe?

CallSphere implements multiple layers of data protection. Customer personal information is vaulted with encryption at rest and in transit. Access is controlled through role-based permissions, and all agent actions are logged for audit purposes. The platform maintains compliance with industry standards and regulations. Customers retain full control over their data and can request deletion or export at any time.

### Can I try a demo?

Yes. CallSphere offers 30-minute walkthrough sessions where prospects can see agents in action, discuss their specific use cases, and understand implementation timelines. The company's voice agents operate 24/7 to handle demo requests, and the team responds to inquiries within one business day. Prospects can request a demo through the website or by calling (845) 388-4261.

## Implementation and Support

CallSphere's implementation process is designed for speed and minimal disruption. Most businesses can have agents live within days rather than weeks or months. The zero-code journey builder means business teams can configure agents without waiting for engineering resources. The platform's integration with existing systems means no data migration or system replacement is required.

The CallSphere team provides ongoing support through the customer success portal, documentation, and direct support channels. Customers can monitor agent performance in real-time through analytics dashboards, adjust workflows instantly through the journey builder, and escalate issues to human support when needed.

## Conclusion

CallSphere's agentic voice and chatbot agents represent a fundamental shift in how businesses handle customer interactions. By combining intelligent automation with seamless human escalation, comprehensive integrations, and proven results, CallSphere enables organizations to scale customer service operations, improve customer satisfaction, and reduce operational costs. Whether automating orders, support, or scheduling across voice and text channels, CallSphere's agents deliver consistent, reliable, and compliant automation that businesses can trust.
`;

const VOICE_AGENT_INSTRUCTIONS = `
You are CallSphere's warm, upbeat concierge speaking as the company's live website representative.

Authoritative source material (treat as your RAG reference for all answers):
${CALLSPHERE_RAG_REFERENCE}

Knowledge + context handling
- Use only the information contained in the reference above. When a visitor asks a question, pull facts, numbers, metrics, pricing, capabilities, industry examples, integrations, or contact info directly from it. If something is missing, say you are unsure and offer to connect them with a human.
- Never invent features or pricing outside this brief. Escalate politely for anything out-of-scope.

Language handling
- CRITICAL: You MUST detect the user's language from their first message or browser locale and respond ENTIRELY in that same language throughout the conversation.
- If the user speaks Spanish, respond in Spanish. If Hindi, respond in Hindi. If French, respond in French. Etc.
- Your greeting should be in the user's detected language. The user's browser language will be provided as context.
- Always match the user's language - do not switch back to English unless the user explicitly requests it.

Conversation style
- Begin every session IMMEDIATELY with a warm greeting in the user's language - DO NOT wait for the user to speak first. Speak your greeting right away upon connection.
- Use time-aware greetings ("Good morning" / "Good afternoon" / "Good evening" based on their local time).
- Example English greeting: "Good afternoon! Welcome to CallSphere. I'm your AI assistant and I'm so excited to help you today! How can I help you?"
- Example Spanish greeting: "¡Buenas tardes! Bienvenido a CallSphere. Soy su asistente de IA y estoy muy emocionado de ayudarle hoy. ¿En qué puedo ayudarle?"
- Maintain a confident, professional, concierge tone that stays warm, concise, and proactive.
- Keep the conversation going until the visitor confirms they are finished.

Engagement playbook
1. Start speaking your greeting IMMEDIATELY when connected - do not wait for user input.
2. After greeting, wait briefly for their response, then diagnose whether they care about voice agents, chatbot agents, pricing, industry use cases, integrations, implementation, or support.
3. Use the reference to tailor answers (mention PCI-compliant checkout, zero-code journey builder, analytics dashboards, omnichannel coverage, Twilio/Shopify/Stripe integrations, sector-specific workflows, etc.).
4. Share proof points when relevant (92% closure, 35% faster handling, 91% tier-one automation, 42% faster order completion).
5. Recommend plans (Starter $149/2k interactions, Growth $499/10k, Scale $1,499/50k plus respective features) or demos, and capture interest for follow-up.
6. Offer contact info (sagar@callsphere.tech, (845) 388-4261), note 24/7 agent availability and 9am-7pm ET team coverage, and invite next steps.

Guardrails
- Do not collect payment data or other sensitive info.
- Be transparent about limitations and escalate to a human when needed.
`;

const DEFAULT_ERROR_MESSAGE = "Voice agent is unavailable. Please try again shortly.";

const extractClientSecret = (payload: SessionTokenResponse | null): string | null => {
  if (!payload) return null;
  if (typeof payload.client_secret === "string") {
    return payload.client_secret;
  }
  return payload.client_secret?.value ?? null;
};

const formatErrorMessage = (candidate: unknown) =>
  candidate instanceof Error ? candidate.message : DEFAULT_ERROR_MESSAGE;

// Analytics logging functions
const createAnalyticsSession = async (sessionId: string): Promise<boolean> => {
  try {
    const utmParams = getUTMParams();
    const response = await fetch("/api/analytics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...utmParams }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to create analytics session:", error);
    return false;
  }
};

const updateAnalyticsSession = async (
  sessionId: string,
  updates: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await fetch("/api/analytics/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...updates }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to update analytics session:", error);
    return false;
  }
};

const logConversationTurn = async (
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  audioDurationMs?: number
): Promise<boolean> => {
  try {
    const response = await fetch("/api/analytics/turns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, role, content, audioDurationMs }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to log conversation turn:", error);
    return false;
  }
};

const enrichSession = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/analytics/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to enrich session:", error);
    return false;
  }
};

export function VoiceAgentLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Session tracking
  const sessionIdRef = useRef<string | null>(null);
  const turnCountRef = useRef(0);

  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const activeCommandRef = useRef<symbol | null>(null);

  const disconnectRealtime = useCallback(() => {
    connectPromiseRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    agentRef.current = null;
  }, []);

  const ensureAgent = useCallback(() => {
    if (!agentRef.current) {
      agentRef.current = new RealtimeAgent({
        name: "CallSphere Concierge",
        instructions: VOICE_AGENT_INSTRUCTIONS,
        voice: "alloy",
      });
    }
    return agentRef.current;
  }, []);

  const ensureRealtimeSession = useCallback(() => {
    if (sessionRef.current) {
      return sessionRef.current;
    }

    const session = new RealtimeSession(ensureAgent(), {
      transport: "webrtc",
    });

    session.on("audio_start", () => {
      setIsSpeaking(true);
    });

    session.on("audio_stopped", () => {
      setIsSpeaking(false);
    });

    // Track which items we've already logged to avoid duplicates
    const loggedItemIds = new Set<string>();

    // Use transport_event to capture all raw events from OpenAI Realtime API
    session.on("transport_event", (event) => {
      if (!sessionIdRef.current) return;

      // Log user speech transcription completed
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        const transcript = (event as { transcript?: string }).transcript;
        if (transcript && transcript.trim()) {
          console.log("[Analytics] User transcript:", transcript);
          logConversationTurn(sessionIdRef.current, "user", transcript).catch((err) =>
            console.error("Failed to log user turn:", err)
          );
        }
      }

      // Log assistant audio transcript done
      if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
        const transcript = (event as { transcript?: string }).transcript;
        if (transcript && transcript.trim()) {
          console.log("[Analytics] Assistant transcript:", transcript);
          logConversationTurn(sessionIdRef.current, "assistant", transcript).catch((err) =>
            console.error("Failed to log assistant turn:", err)
          );
        }
      }

      // Also capture text output if available
      if (event.type === "response.text.done" || event.type === "response.output_text.done") {
        const text = (event as { text?: string }).text;
        if (text && text.trim()) {
          console.log("[Analytics] Assistant text:", text);
          logConversationTurn(sessionIdRef.current, "assistant", text).catch((err) =>
            console.error("Failed to log assistant text turn:", err)
          );
        }
      }
    });

    // Fallback: Also listen for history updates for any missed transcripts
    session.on("history_updated", (history) => {
      if (!sessionIdRef.current) return;

      for (const item of history) {
        if (item.type !== "message") continue;
        if (!item.itemId || loggedItemIds.has(item.itemId)) continue;

        let content = "";
        if (Array.isArray(item.content)) {
          for (const part of item.content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = part as any;
            if (p.type === "input_audio" && p.transcript) {
              content = p.transcript;
              break;
            } else if (p.type === "output_audio" && p.transcript) {
              content = p.transcript;
              break;
            } else if ((p.type === "input_text" || p.type === "output_text" || p.type === "text") && p.text) {
              content = p.text;
              break;
            }
          }
        }

        if (content && content.trim()) {
          loggedItemIds.add(item.itemId);
          const role = item.role as "user" | "assistant";
          console.log("[Analytics] History update -", role, ":", content.substring(0, 50));
          logConversationTurn(sessionIdRef.current, role, content).catch((err) =>
            console.error("Failed to log turn from history:", err)
          );
        }
      }
    });

    session.on("error", (sessionError) => {
      console.error("voice agent realtime error", sessionError);
      setError(DEFAULT_ERROR_MESSAGE);
      setIsListening(false);
      setIsLoading(false);
      setIsOpen(false);

      // Mark session as error
      if (sessionIdRef.current) {
        updateAnalyticsSession(sessionIdRef.current, {
          status: "error",
          errorMessage: sessionError instanceof Error ? sessionError.message : DEFAULT_ERROR_MESSAGE
        });
      }

      disconnectRealtime();
    });

    const transport = session.transport;
    transport.on?.("connection_change", (status: string) => {
      const connected = status === "connected";
      setIsConnected(connected);
      if (!connected) {
        setIsListening(false);
        setIsSpeaking(false);
        setIsOpen(false);
        setIsLoading(false);
      }
    });

    sessionRef.current = session;
    return session;
  }, [disconnectRealtime, ensureAgent]);

  const fetchSessionToken = useCallback(async () => {
    const response = await fetch("/api/voice-agent/session", { method: "POST" });
    const payload = (await response.json().catch(() => null)) as SessionTokenResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? DEFAULT_ERROR_MESSAGE);
    }

    const secret = extractClientSecret(payload);
    if (!secret) {
      throw new Error("Unable to establish realtime session. Missing token.");
    }

    return secret;
  }, []);

  const connectRealtime = useCallback(async () => {
    const session = ensureRealtimeSession();

    if (connectPromiseRef.current) {
      await connectPromiseRef.current;
      return session;
    }

    const promise = (async () => {
      const token = await fetchSessionToken();
      await session.connect({ apiKey: token });
    })();

    connectPromiseRef.current = promise;

    try {
      await promise;
    } finally {
      connectPromiseRef.current = null;
    }

    return session;
  }, [ensureRealtimeSession, fetchSessionToken]);

  const stopSession = useCallback(() => {
    activeCommandRef.current = null;
    setIsDisconnecting(true);
    setIsListening(false);
    setIsSpeaking(false);

    // End analytics session and trigger enrichment
    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      // Mark session as completed and enrich with LLM analysis
      updateAnalyticsSession(currentSessionId, { status: "completed" })
        .then(() => enrichSession(currentSessionId))
        .catch((err) => console.error("Failed to finalize session:", err));

      // Clear session for next conversation
      sessionIdRef.current = null;
      turnCountRef.current = 0;
      clearSessionId();
    }

    // Broadcast disconnecting state immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("voice-agent-status", {
          detail: {
            isOpen: true,
            isListening: false,
            isConnected: false,
            isSpeaking: false,
            isLoading: false,
            isDisconnecting: true,
            hasError: false,
          },
        })
      );
    }

    disconnectRealtime();
    // Small delay to show disconnecting state
    setTimeout(() => {
      setIsOpen(false);
      setIsLoading(false);
      setIsConnected(false);
      setIsDisconnecting(false);
    }, 300);
  }, [disconnectRealtime]);

  // Broadcast status immediately (synchronously)
  const broadcastStatus = useCallback((overrides: Partial<VoiceAgentStatusDetail> = {}) => {
    if (typeof window === "undefined") return;
    const detail: VoiceAgentStatusDetail = {
      isOpen,
      isListening,
      isConnected,
      isSpeaking,
      isLoading,
      isDisconnecting,
      hasError: Boolean(error),
      ...overrides,
    };
    window.dispatchEvent(
      new CustomEvent("voice-agent-status", { detail })
    );
  }, [error, isConnected, isDisconnecting, isListening, isLoading, isOpen, isSpeaking]);

  const startSession = useCallback(async () => {
    if (activeCommandRef.current) {
      return;
    }

    const commandId = Symbol("voice-agent-start");
    activeCommandRef.current = commandId;
    setError(null);
    setIsOpen(true);
    setIsLoading(true);

    // Broadcast connecting state immediately
    broadcastStatus({ isOpen: true, isLoading: true, hasError: false });

    // Create analytics session
    const newSessionId = getOrCreateSessionId();
    sessionIdRef.current = newSessionId;
    turnCountRef.current = 0;
    createAnalyticsSession(newSessionId).catch((err) =>
      console.error("Failed to create analytics session:", err)
    );

    try {
      const session = await connectRealtime();
      setIsListening(true);
      setIsConnected(true);
      
      // Trigger the agent to speak first with a greeting
      setTimeout(() => {
        if (session && sessionRef.current === session) {
          session.sendMessage("[System: User just connected. Start the conversation by greeting them warmly and asking how you can help. Speak immediately without waiting.]");
        }
      }, 500);
    } catch (sessionError) {
      console.error("voice agent session start failed", sessionError);
      setError(formatErrorMessage(sessionError));

      // Mark session as error
      if (sessionIdRef.current) {
        updateAnalyticsSession(sessionIdRef.current, {
          status: "error",
          errorMessage: formatErrorMessage(sessionError)
        });
      }

      stopSession();
    } finally {
      if (activeCommandRef.current === commandId) {
        activeCommandRef.current = null;
      }
      setIsLoading(false);
    }
  }, [broadcastStatus, connectRealtime, stopSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpen = () => void startSession();
    window.addEventListener("open-voice-agent", handleOpen);
    return () => window.removeEventListener("open-voice-agent", handleOpen);
  }, [startSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const { action = "toggle" } = (event as CustomEvent<VoiceAgentCommandDetail>).detail ?? {};

      // Prevent actions while transitioning
      if (isLoading || isDisconnecting) {
        return;
      }

      if (action === "start") {
        if (!isConnected) {
          void startSession();
        }
        return;
      }
      if (action === "stop") {
        if (isConnected) {
          stopSession();
        }
        return;
      }

      // Toggle: if connected, disconnect; otherwise connect
      if (isConnected) {
        stopSession();
      } else {
        void startSession();
      }
    };
    window.addEventListener("voice-agent-command", handler as EventListener);
    return () => window.removeEventListener("voice-agent-command", handler as EventListener);
  }, [isConnected, isDisconnecting, isLoading, startSession, stopSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__voiceAgentReady = true;
    const pending = window.__voiceAgentCommandQueue ?? [];
    if (pending.length) {
      window.__voiceAgentCommandQueue = [];
      for (const detail of pending) {
        window.dispatchEvent(
          new CustomEvent("voice-agent-command", {
            detail,
          })
        );
      }
    }
    return () => {
      window.__voiceAgentReady = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const detail: VoiceAgentStatusDetail = {
      isOpen,
      isListening,
      isConnected,
      isSpeaking,
      isLoading,
      isDisconnecting,
      hasError: Boolean(error),
    };
    window.dispatchEvent(
      new CustomEvent("voice-agent-status", {
        detail,
      })
    );
  }, [error, isConnected, isDisconnecting, isListening, isLoading, isOpen, isSpeaking]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stopSession();
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isOpen, stopSession]);

  useEffect(
    () => () => {
      stopSession();
    },
    [stopSession]
  );

  // Headless component - no visual UI, just manages realtime connection
  // The VoiceAgentBanner consumes status events to display state
  return null;
}

