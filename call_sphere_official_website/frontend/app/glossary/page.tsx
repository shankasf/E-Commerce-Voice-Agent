import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd, DefinedTermSetJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "AI Voice Agent Glossary | Technical Terms | CallSphere",
  description:
    "Definitions of 25 technical terms used in AI voice agent systems: ASR, barge-in, endpointing, guardrail, hallucination, LLM, RAG, SIP, TTS, VAD, WebRTC, and more.",
  alternates: {
    canonical: "https://callsphere.tech/glossary",
  },
  openGraph: {
    title: "AI Voice Agent Glossary | Technical Terms",
    description:
      "Definitions of 25 technical terms used in AI voice agent systems.",
    url: "https://callsphere.tech/glossary",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Voice Agent Glossary | Technical Terms | CallSphere",
    description:
      "Definitions of 25 technical terms used in AI voice agent systems: ASR, LLM, RAG, TTS, VAD, WebRTC, and more.",
  },
};

const glossaryTerms = [
  { term: "ASR", description: "Automatic Speech Recognition. Converts spoken audio into text. ASR models process audio in real time and output transcripts used by the reasoning layer. Accuracy depends on language, accent, and background noise." },
  { term: "Barge-in", description: "The ability for a caller to interrupt the AI agent while it is speaking. When barge-in is detected, the agent stops its current response, processes the new input, and generates a new reply." },
  { term: "Conversation State", description: "A structured object maintained for the duration of a call or chat session. Contains extracted entities, tool results, turn history, and context. Used by the LLM to generate contextually relevant responses." },
  { term: "Endpointing", description: "The process of detecting when a speaker has finished their utterance. Uses silence duration thresholds (typically 600ms) combined with linguistic cues to determine turn boundaries." },
  { term: "Escalation", description: "Transferring a conversation from the AI agent to a human operator. Triggered by policy rules (confidence threshold, turn limit, sensitive topic) or explicit caller request. Full conversation context is passed to the human." },
  { term: "Guardrail", description: "A constraint applied to agent behavior to prevent undesirable outputs. Examples: topic deny-lists, PII redaction, tool allowlists, and confidence thresholds. Guardrails operate independently of the LLM." },
  { term: "Hallucination", description: "When an LLM generates factually incorrect or fabricated information. Mitigated by grounding responses in structured tools, knowledge bases (RAG), and explicit system prompt instructions to avoid speculation." },
  { term: "Human Handoff", description: "The process of transferring an active conversation to a human agent. Includes passing conversation history, extracted entities, and caller sentiment. The human receives full context before joining." },
  { term: "Intent Detection", description: "Identifying the purpose of a caller's utterance. The LLM maps spoken input to predefined intents (e.g., book appointment, check status, make payment) using the system prompt and conversation context." },
  { term: "Latency Budget", description: "The maximum acceptable time between the end of a caller's utterance and the start of the agent's audio response. CallSphere targets under 1.5 seconds end-to-end, distributed across ASR, LLM, and TTS stages." },
  { term: "LLM", description: "Large Language Model. A neural network trained on text data that generates human-like responses. CallSphere supports GPT-4o, Claude, and Gemini. The LLM handles reasoning, intent detection, and response generation." },
  { term: "PII", description: "Personally Identifiable Information. Data that can identify an individual: names, phone numbers, email addresses, SSNs, credit card numbers. CallSphere redacts PII from transcripts and logs by default." },
  { term: "RAG", description: "Retrieval-Augmented Generation. A technique that retrieves relevant documents from a knowledge base and includes them in the LLM's context window. Grounds responses in factual source material rather than relying solely on model training data." },
  { term: "SIP", description: "Session Initiation Protocol. A signaling protocol for establishing, maintaining, and terminating voice calls over IP networks. CallSphere connects to PSTN carriers and PBX systems via SIP trunks." },
  { term: "Speech Synthesis (TTS)", description: "Text-to-Speech. Converts the agent's text response into natural-sounding audio. Configurable voice, speed, pitch, and language per agent. Providers include ElevenLabs, Google TTS, and Azure Neural TTS." },
  { term: "Structured Response", description: "A response from the LLM formatted as structured data (JSON) rather than free text. Used when the agent needs to invoke tools, return specific data fields, or follow a defined output schema." },
  { term: "System Prompt", description: "The initial instructions given to the LLM that define the agent's role, personality, available tools, guardrails, and behavioral constraints. Each agent has a unique system prompt configured during onboarding." },
  { term: "Tool Calling", description: "The mechanism by which an LLM invokes external functions during a conversation. The LLM outputs a tool name and parameters; the platform executes the function and returns results to the LLM for response generation." },
  { term: "Tool Definition", description: "A schema that describes a tool available to the agent. Includes the tool name, a natural-language description, and a JSON schema for input parameters. The LLM uses definitions to decide when and how to invoke tools." },
  { term: "Turn", description: "A single exchange in a conversation: one caller utterance followed by one agent response. Multi-turn conversations maintain context across turns. Turn count is used for escalation policies and analytics." },
  { term: "Turn Detection", description: "The combined process of voice activity detection (VAD) and endpointing that determines when a caller's turn has ended and the agent should begin responding. Prevents the agent from interrupting the caller." },
  { term: "VAD", description: "Voice Activity Detection. An algorithm that distinguishes speech from silence and background noise in an audio stream. VAD triggers ASR processing and contributes to turn detection and endpointing decisions." },
  { term: "Webhook", description: "An HTTP callback triggered by a specific event. CallSphere sends webhooks for events like call started, call ended, escalation triggered, and appointment booked. Payloads are signed with HMAC-SHA256." },
  { term: "WebRTC", description: "Web Real-Time Communication. A browser-based protocol for real-time audio and video. CallSphere uses WebRTC for browser-based voice agents, enabling sub-second audio streaming without plugins." },
  { term: "WebSocket", description: "A persistent, bidirectional communication protocol over TCP. Used for real-time text chat and streaming audio. Lower overhead than HTTP polling for continuous data exchange between client and server." },
];

// Group terms by first letter
const grouped = glossaryTerms.reduce<Record<string, typeof glossaryTerms>>((acc, t) => {
  const letter = t.term[0].toUpperCase();
  if (!acc[letter]) acc[letter] = [];
  acc[letter].push(t);
  return acc;
}, {});

const letters = Object.keys(grouped).sort();

export default function GlossaryPage() {
  return (
    <>
      <DefinedTermSetJsonLd
        name="AI Voice Agent Glossary"
        description="Technical terms used in AI voice agent systems, defined for engineers, product managers, and enterprise buyers."
        url="https://callsphere.tech/glossary"
        terms={glossaryTerms}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Glossary", url: "https://callsphere.tech/glossary" },
        ]}
      />
      <Nav />
      <main id="main" className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">

          {/* Hero */}
          <section className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Reference</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              AI Voice Agent Glossary
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Definitions of {glossaryTerms.length} technical terms used in AI voice agent systems.
            </p>
          </section>

          {/* Letter Navigation */}
          <nav className="mb-10 flex flex-wrap gap-2 justify-center">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                {letter}
              </a>
            ))}
          </nav>

          {/* Terms */}
          <div className="space-y-10">
            {letters.map((letter) => (
              <section key={letter} id={`letter-${letter}`}>
                <h2 className="mb-4 text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
                  {letter}
                </h2>
                <div className="space-y-6">
                  {grouped[letter].map((t) => (
                    <div key={t.term} id={`term-${t.term.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                      <h3 className="font-semibold text-slate-900">{t.term}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
