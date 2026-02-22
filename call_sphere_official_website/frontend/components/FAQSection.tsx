import { FAQ } from "@/components/FAQ";
import { SectionHeading } from "@/components/SectionHeading";

const generalItems = [
  {
    question: "How do you handle payments?",
    answer:
      "Payments are processed by PCI-DSS compliant providers (e.g., Stripe). We do not store card details—works the same for voice calls and chat.",
  },
  {
    question: "Do you support both voice and chat?",
    answer:
      "Yes! CallSphere provides AI-powered voice agents for phone calls and chatbot agents for web chat, SMS, and WhatsApp—all from one platform.",
  },
  {
    question: "Do you integrate with my catalog?",
    answer:
      "Yes. Connect via API or drop in a CSV import - CallSphere keeps it synced across voice and chat agents.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Data is encrypted in transit (TLS) and at rest where supported. We use role-based access controls and audit logging. See our Security page for details.",
  },
  {
    question: "Can I try a demo?",
    answer:
      "Absolutely - book via the form below and we will tailor a walkthrough showing both voice and chat agents for your use case.",
  },
  {
    question: "How long does it take to set up?",
    answer:
      "Most businesses are live within 3-5 business days. Simple use cases like appointment scheduling can be running in as little as 24 hours with our guided onboarding.",
  },
  {
    question: "What languages do your AI agents support?",
    answer:
      "CallSphere agents support 57+ languages with natural-sounding conversations. Popular languages include English, Spanish, French, German, Mandarin, Hindi, Arabic, and Portuguese.",
  },
  {
    question: "Can I customize the voice and personality of my agent?",
    answer:
      "Yes. You can configure tone, speaking style, vocabulary, and personality for each agent. Set different personas for different product lines, regions, or use cases.",
  },
  {
    question: "Is CallSphere HIPAA compliant?",
    answer:
      "Yes. We offer HIPAA-compliant deployments for healthcare organizations, including Business Associate Agreements (BAAs), encrypted PHI handling, and audit logging. Contact us for details.",
  },
  {
    question: "What CRM and business tools do you integrate with?",
    answer:
      "CallSphere integrates with HubSpot, Salesforce, Zendesk, Freshdesk, Shopify, WooCommerce, Stripe, Square, Twilio, and more. Custom integrations are available on Growth and Scale plans.",
  },
  {
    question: "How does CallSphere handle peak call volumes?",
    answer:
      "Our AI agents scale automatically to handle unlimited concurrent calls and chats. There are no wait times or busy signals—every customer gets an immediate response, even during peak hours.",
  },
  {
    question: "Can the AI agent process payments during a call?",
    answer:
      "Yes. Voice and chat agents can securely collect payment information and process transactions through Stripe or Square during the conversation, with PCI-DSS compliant handling.",
  },
  {
    question: "What happens if the AI can't handle a request?",
    answer:
      "CallSphere includes intelligent escalation. If the AI detects a complex issue or the customer requests a human, the call or chat is seamlessly transferred to your team with full context and conversation history.",
  },
  {
    question: "How do I track my AI agent's performance?",
    answer:
      "Every plan includes a real-time analytics dashboard with metrics like resolution rate, sentiment analysis, call duration, topic modeling, and CSAT scores. Export reports in CSV or connect to your BI tools.",
  },
  {
    question: "Can I export my data from CallSphere?",
    answer:
      "Yes. You can export call logs, transcripts, analytics, and customer data at any time via the dashboard or API. We support CSV, JSON, and direct database integrations. Your data is always yours.",
  },
];

const enterpriseComplianceItems = [
  {
    question: "What SLA does CallSphere offer?",
    answer:
      "Growth and Scale plans include a 99.9% uptime SLA. Scale customers receive a dedicated SLA document with penalties and remedies. Starter plans target 99.5% uptime without a contractual guarantee.",
  },
  {
    question: "Can I sign a Data Processing Agreement (DPA)?",
    answer:
      "Yes. We provide a GDPR-compliant DPA on request for all paid plans. The DPA covers data processing scope, sub-processor lists, breach notification timelines, and data subject rights.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "CallSphere infrastructure runs on AWS US-East by default. Scale customers can request data residency in the EU (Frankfurt) or Asia-Pacific (Singapore). Contact sales for region-specific deployments.",
  },
  {
    question: "How are tool permissions managed for AI agents?",
    answer:
      "Each agent has an explicit tool allowlist defined in the system prompt. Tools like payment processing or appointment booking must be individually enabled. Agents cannot invoke tools that are not on their allowlist.",
  },
  {
    question: "Do you support SSO and SAML?",
    answer:
      "SSO via SAML 2.0 and OpenID Connect is available on Scale plans. Growth plans support Google Workspace SSO. Starter plans use email/password authentication with optional two-factor authentication.",
  },
  {
    question: "Is there an audit log?",
    answer:
      "Yes. All agent actions, tool invocations, escalations, and admin changes are recorded in an immutable audit log. Logs are retained for 12 months and can be exported via API or dashboard.",
  },
];

const architectureTechnicalItems = [
  {
    question: "Which LLM providers does CallSphere use?",
    answer:
      "CallSphere supports OpenAI (GPT-4o, GPT-4o-mini), Anthropic (Claude), and Google (Gemini). The LLM is selected per agent based on task complexity, latency requirements, and cost. Scale customers can specify a preferred provider.",
  },
  {
    question: "What is the typical voice response latency?",
    answer:
      "End-to-end voice latency is under 1.5 seconds for most turns. This includes ASR transcription (~300ms), LLM reasoning (~500ms), and TTS synthesis (~200ms). Network and telephony add ~200-400ms depending on carrier.",
  },
  {
    question: "What are the layers in the agent architecture?",
    answer:
      "The architecture has 6 layers: Transport (WebRTC, SIP, WebSocket), Speech (ASR/TTS), Reasoning (LLM with system prompt), Actions (tool calling, API execution), Safety (guardrails, PII redaction), and Integrations (CRM, calendar, payments).",
  },
  {
    question: "Can I connect custom APIs as agent tools?",
    answer:
      "Yes. Define a tool with a name, description, and JSON schema for parameters. CallSphere calls your API endpoint when the agent invokes the tool. Authentication supports API keys, OAuth 2.0, and webhook signatures.",
  },
  {
    question: "How is conversation state managed?",
    answer:
      "Each conversation maintains a turn-by-turn state object that includes extracted entities, tool results, and context. State persists for the duration of the call or chat session. Cross-session memory is available on Growth and Scale plans.",
  },
  {
    question: "What happens during a system outage or failover?",
    answer:
      "CallSphere runs across multiple availability zones. If one zone fails, traffic routes to a healthy zone within 30 seconds. During a full outage, calls forward to your configured fallback number. Chat displays a maintenance message with estimated recovery time.",
  },
];

const integrationsChannelsItems = [
  {
    question: "Does CallSphere support WhatsApp and SMS?",
    answer:
      "Yes. Chat agents can be deployed on WhatsApp Business API and SMS (via Twilio or Vonage). The same agent logic, tools, and knowledge base apply across all channels.",
  },
  {
    question: "Can I bring my own Twilio account (BYOD)?",
    answer:
      "Yes. Connect your existing Twilio account by providing your Account SID and Auth Token. CallSphere provisions phone numbers and routes calls through your account. You retain full control of your Twilio billing.",
  },
  {
    question: "Do you support webhooks for real-time events?",
    answer:
      "Yes. Configure webhooks for events like call started, call ended, escalation triggered, appointment booked, and payment processed. Payloads are signed with HMAC-SHA256 for verification.",
  },
  {
    question: "Can I upload a knowledge base for the agent?",
    answer:
      "Yes. Upload PDFs, DOCX files, or plain text to create a knowledge base. CallSphere uses retrieval-augmented generation (RAG) to ground agent responses in your documentation. Knowledge bases refresh within 5 minutes of upload.",
  },
  {
    question: "Does CallSphere support outbound calling?",
    answer:
      "Yes. Outbound campaigns can be configured via API or dashboard. Use cases include appointment reminders, payment follow-ups, and survey calls. Outbound calls follow TCPA compliance rules and respect do-not-call lists.",
  },
];

const safetyGuardrailsItems = [
  {
    question: "How does CallSphere prevent hallucinations?",
    answer:
      "Agents are grounded in structured tools and knowledge bases. When the agent cannot find a factual answer, it says so rather than guessing. System prompts include explicit instructions to avoid fabrication. RAG retrieval provides source attribution.",
  },
  {
    question: "Can I set topic deny-lists?",
    answer:
      "Yes. Define topics the agent must refuse to discuss (e.g., competitor pricing, legal advice, medical diagnoses). Denied topics trigger a polite decline response and optionally escalate to a human.",
  },
  {
    question: "What triggers a human handoff?",
    answer:
      "Handoff triggers include: customer explicitly requests a human, agent confidence falls below a threshold, conversation exceeds a turn limit, sensitive topics are detected, or a tool execution fails repeatedly. All triggers are configurable per agent.",
  },
  {
    question: "Does CallSphere redact PII from logs?",
    answer:
      "Yes. PII redaction is enabled by default for call transcripts and logs. Credit card numbers, SSNs, and health identifiers are masked before storage. Unredacted transcripts are available only to authorized admin roles on Scale plans.",
  },
];

const billingOnboardingItems = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. All plans include a 14-day free trial with full feature access. No credit card is required to start. At the end of the trial, choose a plan or your account pauses automatically.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes. Upgrade or downgrade between Starter ($149/mo), Growth ($499/mo), and Scale ($1,499/mo) at any time. Changes take effect at the next billing cycle. Prorated credits apply when upgrading mid-cycle.",
  },
  {
    question: "What does onboarding include?",
    answer:
      "Onboarding includes a kickoff call, system prompt configuration, tool setup, knowledge base upload, testing, and go-live support. Starter onboarding is self-serve with documentation. Growth and Scale include a dedicated onboarding specialist.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Yes. Annual billing is available at a 20% discount. Starter: $119/mo billed annually. Growth: $399/mo billed annually. Scale: $1,199/mo billed annually. Contact sales for multi-year agreements.",
  },
];

const faqCategories = [
  { title: "General", items: generalItems },
  { title: "Enterprise & Compliance", items: enterpriseComplianceItems },
  { title: "Architecture & Technical", items: architectureTechnicalItems },
  { title: "Integrations & Channels", items: integrationsChannelsItems },
  { title: "Safety & Guardrails", items: safetyGuardrailsItems },
  { title: "Billing & Onboarding", items: billingOnboardingItems },
];

export const faqItems = faqCategories.flatMap((cat) => cat.items);

export function FAQSection() {
  return (
    <section id="faq" className="section-stack">
      <SectionHeading
        eyebrow="FAQ"
        title="Answers before you ask"
        description="If your question isn't covered, drop us a line—we respond within a day."
        align="center"
      />
      <div className="mx-auto mt-10 max-w-3xl space-y-10">
        {faqCategories.map((cat) => (
          <div key={cat.title}>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {cat.title}
            </h3>
            <FAQ items={cat.items} />
          </div>
        ))}
      </div>
    </section>
  );
}
