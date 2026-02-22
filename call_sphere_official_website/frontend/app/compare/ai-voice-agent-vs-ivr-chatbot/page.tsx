import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "AI Voice Agent vs IVR vs Chatbot vs Human | Technology Comparison",
  description:
    "Side-by-side comparison of agentic AI voice agents, IVR systems, rule-based chatbots, and human operators across 15 capability dimensions.",
  alternates: {
    canonical: "https://callsphere.tech/compare/ai-voice-agent-vs-ivr-chatbot",
  },
  openGraph: {
    title: "AI Voice Agent vs IVR vs Chatbot vs Human Operator",
    description:
      "4-way comparison across 15 capability dimensions: NLU, tool calling, latency, cost, compliance, and more.",
    url: "https://callsphere.tech/compare/ai-voice-agent-vs-ivr-chatbot",
    type: "article",
  },
};

const technologies = [
  {
    name: "Agentic AI Voice",
    definition: "An LLM-powered agent that conducts natural-language voice conversations, understands intent, calls external tools, and executes multi-step workflows autonomously.",
  },
  {
    name: "IVR",
    definition: "Interactive Voice Response. A telephony system that routes callers through pre-recorded menus using keypad or limited speech inputs. Logic is defined by static decision trees.",
  },
  {
    name: "Rule-Based Chatbot",
    definition: "A text-based system that matches user input against predefined patterns or decision trees. Cannot handle ambiguity or execute actions beyond its scripted flows.",
  },
  {
    name: "Human Operator",
    definition: "A trained person who handles customer calls or chats. Offers empathy and judgment but is constrained by availability, cost, and consistency.",
  },
];

const comparisonRows = [
  { capability: "Natural Language Understanding", ai: "Full NLU via LLM", ivr: "Keyword matching only", chatbot: "Pattern matching", human: "Full understanding" },
  { capability: "Multi-Turn Conversation", ai: "Yes, with context", ivr: "No", chatbot: "Limited branching", human: "Yes" },
  { capability: "Tool Calling", ai: "Yes, any API", ivr: "No", chatbot: "No", human: "Manual systems" },
  { capability: "24/7 Availability", ai: "Yes", ivr: "Yes", chatbot: "Yes", human: "Requires shifts" },
  { capability: "Concurrent Handling", ai: "Unlimited", ivr: "Unlimited", chatbot: "Unlimited", human: "1 at a time" },
  { capability: "Languages Supported", ai: "57+", ivr: "Pre-recorded only", chatbot: "Configured languages", human: "Agent-dependent" },
  { capability: "Response Latency", ai: "<1.5 seconds", ivr: "Instant (pre-recorded)", chatbot: "<1 second", human: "Variable (seconds to minutes)" },
  { capability: "Personalization", ai: "Per-turn context + CRM data", ivr: "None", chatbot: "Template variables", human: "Full (if trained)" },
  { capability: "Escalation to Human", ai: "Automatic with context", ivr: "Transfer only", chatbot: "Transfer only", human: "N/A" },
  { capability: "Cost per Interaction", ai: "$0.10-$0.50", ivr: "$0.01-$0.05", chatbot: "$0.01-$0.03", human: "$5-$25" },
  { capability: "Setup Time", ai: "3-5 days", ivr: "Weeks to months", chatbot: "Days to weeks", human: "Weeks (hiring + training)" },
  { capability: "Ambiguity Handling", ai: "Asks clarifying questions", ivr: "Repeats menu", chatbot: "Falls back to default", human: "Asks follow-up" },
  { capability: "Learning Over Time", ai: "Prompt + knowledge updates", ivr: "Manual re-recording", chatbot: "Manual rule updates", human: "Training sessions" },
  { capability: "Compliance Controls", ai: "Guardrails, audit logs, PII redaction", ivr: "Call recording", chatbot: "Chat logs", human: "Policy training" },
  { capability: "Emotional Intelligence", ai: "Sentiment detection, limited empathy", ivr: "None", chatbot: "None", human: "High (varies by person)" },
];

const whenToUse = [
  { tech: "Agentic AI Voice", use: "High-volume inbound/outbound calls requiring multi-step actions: scheduling, ordering, payments, support triage. Best when 24/7 coverage and consistent quality matter." },
  { tech: "IVR", use: "Simple call routing with predictable paths (press 1 for billing, press 2 for support). Works when interactions require no reasoning or data lookup." },
  { tech: "Rule-Based Chatbot", use: "FAQ deflection on websites. Effective for predictable, text-based questions where answers are static and no actions are required." },
  { tech: "Human Operator", use: "Complex negotiations, empathy-critical situations, licensed decisions (legal, medical), and edge cases that require judgment beyond what AI can provide." },
];

export default function AIVoiceAgentVsIVRChatbotPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Compare", url: "https://callsphere.tech/compare" },
          { name: "AI Voice Agent vs IVR vs Chatbot", url: "https://callsphere.tech/compare/ai-voice-agent-vs-ivr-chatbot" },
        ]}
      />
      <Nav />
      <main id="main" className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-6">

          {/* Hero */}
          <section className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Technology Comparison</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              AI Voice Agent vs IVR vs Chatbot vs Human
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              A factual comparison of 4 customer communication technologies across 15 capability dimensions.
            </p>
          </section>

          {/* What Each Technology Is */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">What Each Technology Is</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {technologies.map((t) => (
                <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{t.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.definition}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison Table */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Capability Comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-900 w-1/5">Capability</th>
                    <th className="px-4 py-3 text-left font-semibold text-indigo-700 w-1/5">Agentic AI Voice</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 w-1/5">IVR</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 w-1/5">Rule-Based Chatbot</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 w-1/5">Human Operator</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {comparisonRows.map((row, i) => (
                    <tr key={row.capability} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.capability}</td>
                      <td className="px-4 py-3 text-slate-700">{row.ai}</td>
                      <td className="px-4 py-3 text-slate-600">{row.ivr}</td>
                      <td className="px-4 py-3 text-slate-600">{row.chatbot}</td>
                      <td className="px-4 py-3 text-slate-600">{row.human}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* When to Use Each */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">When to Use Each</h2>
            <div className="space-y-4">
              {whenToUse.map((w) => (
                <div key={w.tech} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{w.tech}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{w.use}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Summary</h2>
            <p className="text-slate-600 leading-relaxed">
              Agentic AI voice agents handle the widest range of tasks autonomously.
              IVR and chatbots remain useful for simple routing and FAQ deflection.
              Human operators are essential for judgment-intensive and empathy-critical scenarios.
              Most organizations benefit from a combination: AI agents for volume, humans for exceptions.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
