import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd, TechArticleJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "How CallSphere Works | Platform Architecture | CallSphere",
  description:
    "Technical reference for CallSphere's AI voice agent platform. Architecture layers, voice pipeline, action execution model, safety controls, and limitations.",
  alternates: {
    canonical: "https://callsphere.tech/platform",
  },
  openGraph: {
    title: "How CallSphere Works | Platform Architecture",
    description:
      "Technical reference for CallSphere's AI voice agent platform. Architecture, voice pipeline, safety controls, and limitations.",
    url: "https://callsphere.tech/platform",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How CallSphere Works | Platform Architecture",
    description:
      "Technical reference for CallSphere's AI voice agent platform. Architecture, voice pipeline, safety controls, and limitations.",
  },
};

const workflowSteps = [
  { step: 1, label: "Inbound Signal", detail: "Call arrives via SIP trunk, WebRTC, or WebSocket. The transport layer establishes a bidirectional audio stream." },
  { step: 2, label: "ASR Transcription", detail: "Automatic speech recognition converts audio to text in real time. Supports 57 languages with speaker diarization." },
  { step: 3, label: "Turn Detection", detail: "Voice activity detection (VAD) and endpointing determine when the caller has finished speaking. Silence threshold: 600ms configurable." },
  { step: 4, label: "Intent Recognition", detail: "The LLM analyzes the transcript against the system prompt and conversation history to identify caller intent." },
  { step: 5, label: "Tool Selection", detail: "Based on intent, the LLM selects zero or more tools from the agent's allowlist. Tool definitions include name, description, and parameter schema." },
  { step: 6, label: "Tool Execution", detail: "Selected tools execute against external APIs (CRM, calendar, payment processor). Results return as structured JSON." },
  { step: 7, label: "Response Generation", detail: "The LLM composes a natural-language response incorporating tool results, conversation context, and guardrail constraints." },
  { step: 8, label: "TTS Synthesis", detail: "Text-to-speech converts the response to audio. Voice, speed, and tone are configurable per agent." },
  { step: 9, label: "Delivery", detail: "Audio streams back to the caller. Barge-in detection allows the caller to interrupt at any point, restarting from step 3." },
];

const architectureLayers = [
  { layer: "Transport", description: "WebRTC, SIP, WebSocket, PSTN. Manages bidirectional audio/text streams and session lifecycle." },
  { layer: "Speech", description: "ASR (speech-to-text), TTS (text-to-speech), VAD (voice activity detection), endpointing, barge-in handling." },
  { layer: "Reasoning", description: "LLM with system prompt, conversation history, and structured output. Supports GPT-4o, Claude, and Gemini." },
  { layer: "Actions", description: "Tool calling engine. Executes API calls, database queries, and workflow triggers based on LLM decisions." },
  { layer: "Safety", description: "Guardrails, PII redaction, topic deny-lists, confidence thresholds, and escalation triggers." },
  { layer: "Integrations", description: "CRM, calendar, payments, ticketing, knowledge base, and custom webhook connectors." },
];

const actionModes = [
  { mode: "Deterministic", description: "Fixed-logic actions like looking up business hours or reading a menu. No LLM reasoning required." },
  { mode: "API Call", description: "Agent invokes an external API (e.g., book appointment, check inventory). Parameters are extracted from conversation context." },
  { mode: "Approval-Required", description: "Agent proposes an action and waits for caller confirmation before executing. Used for payments and irreversible operations." },
  { mode: "Human Handoff", description: "Agent transfers the call to a human operator with full conversation context. Triggered by policy rules or caller request." },
];

const voicePipelineSpecs = [
  { label: "ASR Providers", value: "Deepgram, Google Speech, Whisper" },
  { label: "ASR Latency", value: "~300ms per utterance" },
  { label: "Turn Detection", value: "VAD + endpointing, 600ms configurable silence threshold" },
  { label: "Total Latency Budget", value: "<1.5 seconds end-to-end" },
  { label: "TTS Providers", value: "ElevenLabs, Google TTS, Azure Neural TTS" },
  { label: "Interruption Handling", value: "Barge-in restarts pipeline from turn detection" },
  { label: "Languages", value: "57 languages with accent-aware models" },
];

const guardrails = [
  "Tool allowlists per agent prevent unauthorized actions",
  "Topic deny-lists block discussion of excluded subjects",
  "PII redaction masks sensitive data before storage",
  "Confidence thresholds trigger escalation when the agent is uncertain",
  "Turn limits prevent infinite conversation loops",
  "Rate limiting protects against abuse",
  "Immutable audit logs record every action and tool invocation",
  "HIPAA, PCI-DSS, and GDPR compliance controls available",
];

const whenNotToUse = [
  "Legal disputes requiring licensed legal counsel",
  "Situations where callers expect a named individual",
  "Clinical decisions requiring licensed medical sign-off",
  "Empathy-primary interactions (grief counseling, crisis lines)",
  "Environments without internet connectivity",
];

export default function PlatformPage() {
  return (
    <>
      <TechArticleJsonLd
        title="How CallSphere Works"
        description="Technical reference for CallSphere's AI voice agent platform. Architecture layers, voice pipeline, action execution model, safety controls, and limitations."
        url="https://callsphere.tech/platform"
        datePublished="2026-02-15"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Platform", url: "https://callsphere.tech/platform" },
        ]}
      />
      <Nav />
      <main id="main" className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">

          {/* Hero */}
          <section id="hero" className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Platform</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              How CallSphere Works
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Technical reference for the CallSphere AI voice and chat agent platform.
              Architecture, pipeline, execution model, and safety controls.
            </p>
          </section>

          {/* System Definition */}
          <section id="system-definition" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">System Definition</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">What It Is</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  An agentic AI platform that conducts voice and chat conversations with customers.
                  It understands intent, executes actions via tools, and responds in natural language.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">What It Replaces</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  IVR phone trees, rule-based chatbots, and after-hours voicemail.
                  Handles tasks that previously required a human agent for each interaction.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">What It Does Not Replace</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Human agents for complex escalations, licensed professionals (legal, medical),
                  and empathy-primary interactions. CallSphere augments your team, not eliminates it.
                </p>
              </div>
            </div>
          </section>

          {/* Mechanistic Workflow */}
          <section id="workflow" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mechanistic Workflow</h2>
            <p className="text-slate-600 mb-6">
              Every voice interaction follows these 9 steps from inbound signal to response delivery.
            </p>
            <div className="space-y-4">
              {workflowSteps.map((s) => (
                <div key={s.step} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{s.label}</h3>
                    <p className="mt-1 text-sm text-slate-600">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Agent Architecture */}
          <section id="architecture" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Agent Architecture</h2>
            <p className="text-slate-600 mb-6">
              The platform is organized into 6 layers. Each layer is independently replaceable.
            </p>
            <div className="space-y-3">
              {architectureLayers.map((l, i) => (
                <div key={l.layer} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{l.layer}</h3>
                    <p className="mt-1 text-sm text-slate-600">{l.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Voice Pipeline */}
          <section id="voice-pipeline" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Voice Pipeline</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {voicePipelineSpecs.map((spec) => (
                    <tr key={spec.label} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-3 font-medium text-slate-900 bg-slate-50 w-1/3">{spec.label}</td>
                      <td className="px-6 py-3 text-slate-600">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Action Execution Model */}
          <section id="action-execution" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Action Execution Model</h2>
            <p className="text-slate-600 mb-6">
              Agent actions fall into 4 modes depending on risk and reversibility.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {actionModes.map((m) => (
                <div key={m.mode} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{m.mode}</h3>
                  <p className="text-sm text-slate-600">{m.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Enterprise Safety & Control */}
          <section id="safety" className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Enterprise Safety & Control</h2>
            <ul className="space-y-3">
              {guardrails.map((g) => (
                <li key={g} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {g}
                </li>
              ))}
            </ul>
          </section>

          {/* When Not to Use */}
          <section id="when-not-to-use" className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">When Not to Use CallSphere</h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm font-medium text-amber-800 mb-4">
                CallSphere is not suitable for every use case. Do not use it for:
              </p>
              <ul className="space-y-2">
                {whenNotToUse.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-amber-900">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
