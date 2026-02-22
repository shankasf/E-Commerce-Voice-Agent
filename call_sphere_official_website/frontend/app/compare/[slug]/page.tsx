import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Shield,
  Globe,
  DollarSign,
  Mic,
  MessageSquare,
  Clock,
  Zap,
  BarChart3,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FeatureRow = {
  feature: string;
  callsphere: string | boolean;
  competitor: string | boolean;
  tooltip?: string;
};

type Differentiator = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type ComparisonData = {
  slug: string;
  competitorName: string;
  competitorShortName: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  subheadline: string;
  overview: {
    callsphere: string;
    competitor: string;
  };
  featureTable: FeatureRow[];
  differentiators: Differentiator[];
  pricingComparison: {
    callsphere: string;
    competitor: string;
    detail: string;
  };
  verdict: string;
  ctaHeadline: string;
  ctaDescription: string;
};

/* ------------------------------------------------------------------ */
/*  Comparison Data                                                    */
/* ------------------------------------------------------------------ */

const comparisons: Record<string, ComparisonData> = {
  "callsphere-vs-bland-ai": {
    slug: "callsphere-vs-bland-ai",
    competitorName: "Bland.ai",
    competitorShortName: "Bland.ai",
    metaTitle:
      "CallSphere vs Bland.ai: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Bland.ai AI voice agents. See how CallSphere offers live demos, voice + chat, transparent pricing from $149/mo, HIPAA compliance, and 57+ languages vs Bland.ai's developer API.",
    headline: "CallSphere vs Bland.ai: AI Voice Agent Comparison 2026",
    subheadline:
      "See how CallSphere's all-in-one AI voice and chat platform compares to Bland.ai's developer-focused API for building voice agents.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform built for businesses of all sizes. It combines voice and chat in a unified platform with transparent pricing, live interactive demos, HIPAA compliance with a signed BAA, and support for 57+ languages. Businesses can go live in 3\u20135 days without writing a single line of code.",
      competitor:
        "Bland.ai is a developer-focused API platform for building custom AI phone agents. It provides building blocks for developers to create voice AI workflows, with pricing based on per-minute usage. Bland.ai is voice-only and requires technical expertise to deploy, with no live demo available on their website.",
    },
    featureTable: [
      {
        feature: "Live Interactive Demo",
        callsphere: true,
        competitor: false,
        tooltip:
          "CallSphere lets you try a live AI voice agent on the website before buying",
      },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Transparent Pricing",
        callsphere: "$149 \u2013 $1,499/mo",
        competitor: "Per-minute pricing",
      },
      { feature: "No-Code Setup", callsphere: true, competitor: false },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: false },
      { feature: "GDPR / CPRA Compliant", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "Limited",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Via API" },
      {
        feature: "Appointment Scheduling",
        callsphere: true,
        competitor: "Build your own",
      },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Weeks\u2013months (dev required)",
      },
      {
        feature: "Dedicated Support",
        callsphere: true,
        competitor: "Developer docs",
      },
    ],
    differentiators: [
      {
        title: "Try Before You Buy",
        description:
          "CallSphere is the only AI voice agent platform with live interactive demos on the website. Talk to a real AI agent handling healthcare, restaurant, or salon scenarios \u2014 no signup or sales call required. Bland.ai has no public demo.",
        icon: Mic,
      },
      {
        title: "Voice + Chat in One Platform",
        description:
          "CallSphere unifies voice and chat agents on a single platform with shared context, analytics, and workflows. Bland.ai is voice-only, meaning businesses need a separate vendor for chat \u2014 creating data silos and higher costs.",
        icon: MessageSquare,
      },
      {
        title: "Go Live in Days, Not Months",
        description:
          "CallSphere is a turnkey solution that deploys in 3\u20135 days with no coding required. Bland.ai requires developers to build, test, and maintain custom integrations using their API, which can take weeks or months.",
        icon: Zap,
      },
      {
        title: "Predictable Monthly Pricing",
        description:
          "CallSphere offers flat-rate plans starting at $149/mo so businesses can budget with confidence. Bland.ai charges per minute, which makes costs unpredictable and can lead to bill shock during high call volumes.",
        icon: DollarSign,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). No per-minute charges, no hidden fees. All plans include voice + chat agents.",
      competitor:
        "Per-minute pricing model. Costs scale directly with usage and can become unpredictable during busy periods. Enterprise pricing available but not publicly listed.",
      detail:
        "For a business handling 500 calls per month averaging 3 minutes each, CallSphere\u2019s Growth plan at $499/mo provides predictable budgeting. With Bland.ai\u2019s per-minute model, the same volume could cost significantly more and fluctuate month to month.",
    },
    verdict:
      "CallSphere is the better choice for businesses that want a complete, ready-to-deploy AI voice and chat platform with transparent pricing and enterprise compliance. Bland.ai may suit developer teams that want to build custom voice-only solutions from scratch using an API, but the longer deployment time, per-minute costs, and lack of chat support make it less practical for most businesses.",
    ctaHeadline: "See the Difference for Yourself",
    ctaDescription:
      "Try CallSphere\u2019s live AI voice agent demo right now \u2014 no signup required. Then visit our industry pages to see agents built for your specific use case.",
  },

  "callsphere-vs-polyai": {
    slug: "callsphere-vs-polyai",
    competitorName: "PolyAI",
    competitorShortName: "PolyAI",
    metaTitle:
      "CallSphere vs PolyAI: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and PolyAI AI voice agents. CallSphere offers transparent pricing from $149/mo, live demos, and fast setup vs PolyAI's enterprise-only model with long sales cycles and no public pricing.",
    headline: "CallSphere vs PolyAI: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s accessible AI voice and chat platform with PolyAI\u2019s enterprise-focused voice assistant for large contact centers.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform designed for businesses of all sizes. With transparent pricing starting at $149/mo, live interactive demos, HIPAA compliance, and 57+ language support, CallSphere makes enterprise-grade AI accessible to everyone \u2014 from local clinics to Fortune 500 companies.",
      competitor:
        "PolyAI is an enterprise-focused conversational AI company that builds custom voice assistants for large contact centers. They focus exclusively on voice, require a lengthy sales and onboarding process, do not publish pricing, and primarily target large enterprises with high call volumes.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Transparent Pricing",
        callsphere: "$149 \u2013 $1,499/mo",
        competitor: "Contact sales only",
      },
      { feature: "SMB-Friendly", callsphere: true, competitor: false },
      { feature: "Self-Serve Signup", callsphere: true, competitor: false },
      {
        feature: "HIPAA Compliant (BAA)",
        callsphere: true,
        competitor: "Enterprise only",
      },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: true },
      { feature: "GDPR / CPRA Compliant", callsphere: true, competitor: true },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "10+",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: true },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "6\u201312 weeks",
      },
      {
        feature: "Minimum Contract",
        callsphere: "Monthly",
        competitor: "Annual (enterprise)",
      },
      { feature: "Dedicated Support", callsphere: true, competitor: true },
    ],
    differentiators: [
      {
        title: "Accessible to All Business Sizes",
        description:
          "CallSphere serves businesses of every size with plans starting at $149/mo. PolyAI focuses exclusively on large enterprises, leaving SMBs and mid-market companies without an option. CallSphere brings enterprise-grade AI to businesses that PolyAI won\u2019t serve.",
        icon: Users,
      },
      {
        title: "Live Before You Commit",
        description:
          "CallSphere deploys in 3\u20135 days and offers live demos you can try right now. PolyAI\u2019s enterprise sales cycle typically takes 6\u201312 weeks from initial contact to go-live, with no public demo available to evaluate the product beforehand.",
        icon: Clock,
      },
      {
        title: "Voice + Chat, Not Voice Only",
        description:
          "CallSphere combines voice and chat agents on a single platform with unified analytics and shared context. PolyAI is voice-only, so businesses need additional vendors and integrations to cover chat and messaging channels.",
        icon: MessageSquare,
      },
      {
        title: "Transparent, Predictable Costs",
        description:
          "CallSphere publishes all pricing on its website \u2014 no surprises. PolyAI requires contacting sales for a custom quote, making it impossible to evaluate cost without entering a sales process. CallSphere\u2019s approach means you know exactly what you\u2019ll pay before your first conversation.",
        icon: BarChart3,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). No annual contracts required. All plans include voice + chat agents, integrations, and support.",
      competitor:
        "Custom enterprise pricing only. Requires contacting their sales team, going through a discovery process, and negotiating a custom contract. Typically involves annual commitments and five-figure budgets.",
      detail:
        "PolyAI is designed for enterprises handling millions of calls. For most businesses, CallSphere delivers the same AI voice capabilities at a fraction of the cost, with the added benefit of chat agents included. Businesses can start with the $149/mo Starter plan and scale up as needed.",
    },
    verdict:
      "CallSphere is the clear choice for businesses that want enterprise-grade AI voice and chat agents without the enterprise sales cycle, pricing opacity, or voice-only limitations. PolyAI can be a fit for very large contact centers with dedicated budgets and long implementation timelines, but most businesses will find CallSphere faster to deploy, more affordable, and more versatile.",
    ctaHeadline: "Skip the Sales Cycle",
    ctaDescription:
      "Try CallSphere\u2019s live AI voice agent demo instantly \u2014 no sales call, no contract, no waiting. See exactly what you\u2019re getting before you commit.",
  },

  "callsphere-vs-smith-ai": {
    slug: "callsphere-vs-smith-ai",
    competitorName: "Smith.ai",
    competitorShortName: "Smith.ai",
    metaTitle:
      "CallSphere vs Smith.ai: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Smith.ai for business call handling. CallSphere offers fully AI-powered voice + chat from $149/mo vs Smith.ai's human + AI hybrid starting at $292.50/mo with per-call pricing.",
    headline: "CallSphere vs Smith.ai: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s fully autonomous AI voice and chat platform with Smith.ai\u2019s human + AI hybrid receptionist service.",
    overview: {
      callsphere:
        "CallSphere is a fully autonomous AI voice and chat agent platform that handles customer communications 24/7 without human intervention. With 57+ language support, HIPAA compliance, and transparent pricing from $149/mo, CallSphere delivers unlimited scalability and consistent quality on every interaction.",
      competitor:
        "Smith.ai is a virtual receptionist service that combines human operators with AI technology. Starting at $292.50/mo for 30 calls, Smith.ai focuses on receptionist tasks like answering calls, scheduling appointments, and qualifying leads. The service relies on human agents augmented by AI, which limits scalability and availability.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      {
        feature: "Fully Autonomous AI",
        callsphere: true,
        competitor: "Human + AI hybrid",
      },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: true },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "$292.50/mo (30 calls)",
      },
      {
        feature: "Unlimited Calls",
        callsphere: "Included in plan",
        competitor: "Per-call overage fees",
      },
      {
        feature: "True 24/7 Availability",
        callsphere: true,
        competitor: "Limited after-hours",
      },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: false },
      { feature: "GDPR / CPRA Compliant", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "English + Spanish",
      },
      {
        feature: "Concurrent Call Handling",
        callsphere: "Unlimited",
        competitor: "Limited by staff",
      },
      {
        feature: "Consistency Across Calls",
        callsphere: "100% consistent",
        competitor: "Varies by operator",
      },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "1\u20132 weeks",
      },
    ],
    differentiators: [
      {
        title: "Unlimited Scale, Zero Wait Times",
        description:
          "CallSphere handles unlimited concurrent calls instantly \u2014 no hold times, no staffing constraints, no capacity limits. Smith.ai relies on human operators, which means callers may wait during peak times and capacity is always limited by headcount.",
        icon: Zap,
      },
      {
        title: "57+ Languages vs. Two",
        description:
          "CallSphere supports 57+ languages natively, making it ideal for businesses with diverse customer bases. Smith.ai primarily supports English and Spanish, leaving businesses that serve multilingual communities without coverage.",
        icon: Globe,
      },
      {
        title: "Lower Cost, More Included",
        description:
          "CallSphere starts at $149/mo with voice + chat agents included. Smith.ai starts at $292.50/mo for just 30 calls \u2014 after that, you pay per-call overage fees. For businesses handling hundreds of calls monthly, CallSphere can cost a fraction of Smith.ai.",
        icon: DollarSign,
      },
      {
        title: "HIPAA Compliance Built In",
        description:
          "CallSphere provides full HIPAA compliance with a signed BAA, SOC 2 alignment, and GDPR/CPRA compliance on all plans. Smith.ai does not offer HIPAA compliance, making it unsuitable for healthcare practices that handle protected health information.",
        icon: Shield,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents included on all plans. No per-call charges, no overage fees.",
      competitor:
        "Starts at $292.50/mo for 30 calls ($9.75/call). Additional calls billed at per-call rates. Chat is separate. Costs scale linearly with volume, making high-volume months expensive.",
      detail:
        "A business handling 200 calls per month would pay $149\u2013$499/mo with CallSphere (depending on features needed). With Smith.ai, the same volume would cost approximately $1,950/mo or more in per-call fees \u2014 nearly 4x the cost for a human+AI hybrid that still can\u2019t match the consistency and scalability of CallSphere\u2019s fully autonomous AI.",
    },
    verdict:
      "CallSphere is the superior choice for businesses that want fully autonomous, scalable AI voice and chat agents with enterprise compliance and multilingual support at a predictable cost. Smith.ai works for businesses that specifically want human operators on calls, but the higher cost, limited languages, lack of HIPAA compliance, and scalability constraints make it a more expensive and less flexible option for most use cases.",
    ctaHeadline: "AI That Outperforms Human + AI Hybrids",
    ctaDescription:
      "Try CallSphere\u2019s live AI voice agent and hear the difference yourself. Our fully autonomous AI delivers consistent, HIPAA-compliant interactions at a fraction of the cost.",
  },

  "callsphere-vs-vapi": {
    slug: "callsphere-vs-vapi",
    competitorName: "Vapi.ai",
    competitorShortName: "Vapi",
    metaTitle:
      "CallSphere vs Vapi: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Vapi AI voice agents. CallSphere offers a turnkey voice + chat platform from $149/mo vs Vapi's developer API with per-minute pricing. See the full breakdown.",
    headline: "CallSphere vs Vapi: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s ready-to-deploy AI voice and chat platform with Vapi\u2019s developer-first API for building custom voice agents.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform that deploys in 3\u20135 days without writing code. It combines voice and chat agents in a single platform with HIPAA compliance, 57+ languages, transparent pricing from $149/mo, and live interactive demos you can try before you buy.",
      competitor:
        "Vapi is a developer-focused API platform for building voice AI applications. It provides low-level building blocks \u2014 LLM orchestration, speech-to-text, text-to-speech \u2014 that developers assemble into custom voice agents. Vapi charges per minute and requires significant engineering effort to deploy a production-ready solution.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Transparent Pricing",
        callsphere: "$149 \u2013 $1,499/mo",
        competitor: "$0.05\u2013$0.15/min + provider costs",
      },
      { feature: "No-Code Setup", callsphere: true, competitor: false },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "Depends on provider",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Build your own" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: "Build your own" },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Weeks\u2013months (dev required)",
      },
      {
        feature: "Dedicated Support",
        callsphere: true,
        competitor: "Community + docs",
      },
    ],
    differentiators: [
      {
        title: "Production-Ready vs. Build-It-Yourself",
        description:
          "CallSphere ships a complete product with CRM integrations, appointment scheduling, payment processing, and analytics built in. Vapi gives you API primitives \u2014 you still need to build, test, and maintain the business logic, integrations, and UI yourself.",
        icon: Zap,
      },
      {
        title: "Predictable Pricing vs. Variable Costs",
        description:
          "CallSphere charges flat monthly fees starting at $149/mo. Vapi bills per minute plus separate charges for LLM, STT, and TTS providers. A busy month can lead to unexpected bills that are 5\u201310x higher than projected.",
        icon: DollarSign,
      },
      {
        title: "Voice + Chat in One Platform",
        description:
          "CallSphere handles both voice calls and website chat with shared context and unified analytics. Vapi is voice-only, leaving businesses to find and integrate a separate chat solution.",
        icon: MessageSquare,
      },
      {
        title: "HIPAA Compliance Built In",
        description:
          "CallSphere provides HIPAA compliance with a signed BAA on all plans. Vapi does not offer HIPAA compliance or a BAA, making it unsuitable for healthcare, legal, and financial services without additional custom security work.",
        icon: Shield,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents included on all plans. No per-minute charges.",
      competitor:
        "Per-minute pricing ($0.05\u2013$0.15/min) plus separate costs for the LLM provider (OpenAI, Anthropic), speech-to-text, and text-to-speech. Total per-minute cost can reach $0.15\u2013$0.30+ depending on configuration.",
      detail:
        "A business handling 500 calls/month averaging 3 minutes each (1,500 minutes) could pay $225\u2013$450/mo with Vapi in API costs alone \u2014 before adding engineering salaries to build and maintain the solution. CallSphere\u2019s Growth plan at $499/mo includes everything with zero engineering overhead.",
    },
    verdict:
      "CallSphere is the right choice for businesses that want a working AI voice and chat solution deployed fast with predictable costs and enterprise compliance. Vapi is designed for developer teams that want full control over every component and are willing to invest engineering time to build a custom solution. For most businesses, CallSphere delivers better time-to-value at lower total cost.",
    ctaHeadline: "Skip the Build Phase",
    ctaDescription:
      "Why spend months building when you can deploy in days? Try CallSphere\u2019s live AI voice agent demo right now \u2014 no API key, no code, no signup required.",
  },

  "callsphere-vs-synthflow": {
    slug: "callsphere-vs-synthflow",
    competitorName: "Synthflow AI",
    competitorShortName: "Synthflow",
    metaTitle:
      "CallSphere vs Synthflow: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Synthflow AI voice agents. See how CallSphere offers voice + chat, HIPAA compliance, and transparent pricing vs Synthflow's no-code voice-only platform.",
    headline: "CallSphere vs Synthflow: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s enterprise-grade AI voice and chat platform with Synthflow\u2019s no-code AI calling solution.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform with transparent pricing from $149/mo, HIPAA compliance, 57+ languages, and live demos. It deploys in 3\u20135 days and combines voice and chat agents on a single platform with built-in CRM integrations, appointment scheduling, and payment processing.",
      competitor:
        "Synthflow is a no-code AI voice agent platform focused on outbound and inbound phone calls. It offers drag-and-drop agent builders with templates for sales, support, and scheduling. Synthflow is voice-only and charges per minute on top of monthly subscription fees, with pricing starting around $29/mo plus usage.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Pricing Model",
        callsphere: "Flat monthly",
        competitor: "Monthly + per-minute",
      },
      { feature: "No-Code Setup", callsphere: true, competitor: true },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "12+",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: true },
      { feature: "Appointment Scheduling", callsphere: true, competitor: true },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "1\u20137 days",
      },
      {
        feature: "Dedicated Support",
        callsphere: true,
        competitor: "Email support",
      },
    ],
    differentiators: [
      {
        title: "Voice + Chat vs. Voice Only",
        description:
          "CallSphere unifies voice and chat agents with shared context and analytics. Synthflow only handles phone calls, so businesses need a separate chat solution \u2014 creating data silos and duplicated workflows.",
        icon: MessageSquare,
      },
      {
        title: "HIPAA & Enterprise Compliance",
        description:
          "CallSphere is HIPAA compliant with a signed BAA, SOC 2 aligned, and GDPR/CPRA compliant. Synthflow does not offer HIPAA compliance, making it unsuitable for healthcare, legal, and financial services.",
        icon: Shield,
      },
      {
        title: "No Per-Minute Surprises",
        description:
          "CallSphere\u2019s flat monthly pricing means no bill shock. Synthflow charges per minute on top of subscription fees, which can make costs unpredictable during high-volume periods.",
        icon: DollarSign,
      },
      {
        title: "57+ Languages vs. 12+",
        description:
          "CallSphere supports 57+ languages natively, serving diverse global customer bases. Synthflow supports approximately 12 languages, limiting its usefulness for multilingual businesses.",
        icon: Globe,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). All plans include voice + chat agents with no per-minute charges.",
      competitor:
        "Starts at $29/mo for basic features, but adds per-minute charges ($0.08\u2013$0.13/min) for actual call time. Higher tiers ($99\u2013$499/mo) include more minutes but still charge overages.",
      detail:
        "Synthflow\u2019s entry price looks low at $29/mo, but 500 calls averaging 3 minutes each adds $120\u2013$195/mo in per-minute fees, bringing the real cost to $149\u2013$224/mo for voice only. CallSphere\u2019s $149/mo Starter plan includes both voice and chat with no usage charges.",
    },
    verdict:
      "CallSphere is the stronger choice for businesses that need voice and chat in one platform with enterprise compliance and predictable pricing. Synthflow can work for simple voice-only use cases where HIPAA compliance is not required, but its per-minute pricing model and lack of chat support limit its value as businesses scale.",
    ctaHeadline: "More Channels, More Compliance, Less Complexity",
    ctaDescription:
      "CallSphere gives you voice and chat agents in one platform with HIPAA compliance included. Try the live demo and see the difference.",
  },

  "callsphere-vs-retell-ai": {
    slug: "callsphere-vs-retell-ai",
    competitorName: "Retell AI",
    competitorShortName: "Retell AI",
    metaTitle:
      "CallSphere vs Retell AI: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Retell AI voice agents. CallSphere offers turnkey deployment with voice + chat from $149/mo vs Retell AI's developer API with per-minute pricing.",
    headline: "CallSphere vs Retell AI: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s complete AI voice and chat platform with Retell AI\u2019s developer-focused voice agent API.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform built for businesses of all sizes. It deploys in 3\u20135 days with no coding, includes HIPAA compliance, supports 57+ languages, and offers transparent pricing from $149/mo. Live demos are available on the website.",
      competitor:
        "Retell AI is a developer API for building conversational voice agents. It provides voice infrastructure \u2014 low-latency speech processing, LLM orchestration, and telephony integration \u2014 that developers use to build custom voice applications. Retell charges per minute and requires engineering resources to deploy.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Transparent Pricing",
        callsphere: "$149 \u2013 $1,499/mo",
        competitor: "Per-minute API pricing",
      },
      { feature: "No-Code Setup", callsphere: true, competitor: false },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: "Enterprise only" },
      { feature: "SOC 2 Aligned", callsphere: true, competitor: true },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "20+",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Build your own" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: "Build your own" },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Weeks (dev required)",
      },
      {
        feature: "Ultra-Low Latency",
        callsphere: true,
        competitor: true,
      },
    ],
    differentiators: [
      {
        title: "Complete Solution vs. Building Blocks",
        description:
          "CallSphere is a finished product with CRM integrations, scheduling, payments, and analytics. Retell AI provides voice infrastructure that developers must build upon \u2014 adding weeks of engineering time and ongoing maintenance costs to reach the same functionality.",
        icon: Zap,
      },
      {
        title: "Voice + Chat in One Platform",
        description:
          "CallSphere handles phone calls and website chat with shared customer context. Retell AI is voice-only, requiring a separate chat solution and creating fragmented customer data.",
        icon: MessageSquare,
      },
      {
        title: "Flat Pricing vs. Per-Minute Bills",
        description:
          "CallSphere offers predictable monthly pricing from $149/mo. Retell AI charges per minute plus LLM and telephony costs, making budgeting difficult for businesses with variable call volumes.",
        icon: DollarSign,
      },
      {
        title: "Deploy in Days, Not Weeks",
        description:
          "CallSphere deploys in 3\u20135 days with no code. Retell AI requires developers to build the agent logic, integrations, and user interface from scratch, typically taking weeks to reach production readiness.",
        icon: Clock,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents, integrations, and support included on all plans.",
      competitor:
        "Per-minute pricing starting around $0.07\u2013$0.15/min depending on the plan. Additional costs for LLM tokens, telephony, and premium features. Enterprise plans available with custom pricing.",
      detail:
        "For 1,500 minutes/month of call time, Retell AI costs approximately $105\u2013$225/mo in API fees alone \u2014 before accounting for engineering time to build and maintain the solution. CallSphere\u2019s Growth plan at $499/mo includes everything out of the box with zero development overhead.",
    },
    verdict:
      "CallSphere is the better choice for businesses that want a complete, production-ready AI voice and chat platform without engineering investment. Retell AI\u2019s strong point is its low-latency voice infrastructure, which appeals to developer teams building highly customized voice applications. For businesses prioritizing speed-to-value and total cost of ownership, CallSphere wins.",
    ctaHeadline: "Production-Ready in Days, Not Months",
    ctaDescription:
      "Stop building infrastructure and start serving customers. Try CallSphere\u2019s live AI voice agent demo \u2014 no API key required.",
  },

  "callsphere-vs-goodcall": {
    slug: "callsphere-vs-goodcall",
    competitorName: "Goodcall",
    competitorShortName: "Goodcall",
    metaTitle:
      "CallSphere vs Goodcall: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Goodcall AI phone agents. CallSphere offers voice + chat, 57+ languages, and HIPAA compliance vs Goodcall's SMB-focused AI receptionist.",
    headline: "CallSphere vs Goodcall: AI Phone Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s enterprise-grade AI voice and chat platform with Goodcall\u2019s AI-powered phone agent for small businesses.",
    overview: {
      callsphere:
        "CallSphere is a full-featured AI voice and chat agent platform serving businesses from SMBs to enterprises. It offers 57+ languages, HIPAA compliance with a signed BAA, voice and chat in one platform, transparent pricing from $149/mo, and live demos. CallSphere handles appointment scheduling, payment processing, CRM integration, and more.",
      competitor:
        "Goodcall is an AI phone answering service designed for small businesses. It focuses on answering calls, taking messages, and basic appointment scheduling. Goodcall is voice-only, English-focused, and targets local service businesses like plumbers, dentists, and salons with simple call handling needs.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "$59/mo",
      },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "English",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Limited" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: true },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      { feature: "Custom AI Training", callsphere: true, competitor: "Limited" },
      {
        feature: "Enterprise Features",
        callsphere: true,
        competitor: false,
      },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "1\u20133 days",
      },
      {
        feature: "Concurrent Call Handling",
        callsphere: "Unlimited",
        competitor: "Limited",
      },
    ],
    differentiators: [
      {
        title: "Voice + Chat vs. Voice Only",
        description:
          "CallSphere handles both phone calls and website chat with shared context. Goodcall only answers phone calls, leaving businesses without an AI solution for their website visitors and messaging channels.",
        icon: MessageSquare,
      },
      {
        title: "57+ Languages vs. English Only",
        description:
          "CallSphere supports 57+ languages, serving diverse customer bases globally. Goodcall operates in English only, excluding businesses that serve multilingual communities.",
        icon: Globe,
      },
      {
        title: "Enterprise-Grade Compliance",
        description:
          "CallSphere provides HIPAA compliance with a signed BAA, SOC 2 alignment, and GDPR/CPRA compliance. Goodcall lacks these enterprise compliance certifications, limiting its use in regulated industries.",
        icon: Shield,
      },
      {
        title: "Scales from SMB to Enterprise",
        description:
          "CallSphere serves businesses of every size with plans that scale from $149/mo to enterprise custom pricing. Goodcall is designed for small local businesses and lacks the features and infrastructure that growing companies need.",
        icon: Users,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents, all integrations, and HIPAA compliance included.",
      competitor:
        "Plans start at $59/mo for basic call answering. Higher tiers ($99\u2013$199/mo) add more features. Voice only, English only.",
      detail:
        "Goodcall\u2019s lower entry price is appealing for very small businesses with basic needs. However, businesses that need chat support, multilingual coverage, HIPAA compliance, or advanced integrations will outgrow Goodcall quickly. CallSphere\u2019s $149/mo Starter plan includes everything Goodcall offers plus chat agents, 57+ languages, and enterprise compliance.",
    },
    verdict:
      "CallSphere is the better choice for businesses that need a complete AI communications platform with enterprise compliance, multilingual support, and room to grow. Goodcall works for small English-speaking businesses with simple phone answering needs, but its voice-only, English-only approach and lack of compliance certifications limit its usefulness as businesses scale.",
    ctaHeadline: "Outgrow Basic Call Answering",
    ctaDescription:
      "CallSphere gives you voice + chat, 57+ languages, and HIPAA compliance in one platform. Try the live demo and see what enterprise-grade AI sounds like.",
  },

  "callsphere-vs-dialzara": {
    slug: "callsphere-vs-dialzara",
    competitorName: "Dialzara",
    competitorShortName: "Dialzara",
    metaTitle:
      "CallSphere vs Dialzara: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Dialzara AI phone agents. CallSphere offers voice + chat, HIPAA compliance, and 57+ languages vs Dialzara's AI receptionist for SMBs.",
    headline: "CallSphere vs Dialzara: AI Voice Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s enterprise-ready AI voice and chat platform with Dialzara\u2019s AI virtual receptionist.",
    overview: {
      callsphere:
        "CallSphere is a full-featured AI voice and chat agent platform with HIPAA compliance, 57+ languages, transparent pricing from $149/mo, and live demos. It deploys in 3\u20135 days and includes CRM integrations, appointment scheduling, payment processing, and unified analytics across voice and chat channels.",
      competitor:
        "Dialzara is an AI virtual receptionist that answers phone calls for small businesses. It handles inbound call answering, message taking, and basic appointment scheduling. Dialzara focuses on replacing traditional answering services with AI at a lower cost point.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "$29/mo",
      },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "English",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Basic" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: true },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Custom Workflows",
        callsphere: true,
        competitor: "Limited",
      },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Same day",
      },
      {
        feature: "Concurrent Call Handling",
        callsphere: "Unlimited",
        competitor: "Unlimited",
      },
      {
        feature: "Enterprise Features",
        callsphere: true,
        competitor: false,
      },
    ],
    differentiators: [
      {
        title: "Full Platform vs. Receptionist",
        description:
          "CallSphere is a complete AI communications platform with voice, chat, CRM sync, payments, and analytics. Dialzara is a phone receptionist \u2014 it answers calls and takes messages but lacks the depth needed for complex business workflows.",
        icon: Zap,
      },
      {
        title: "Voice + Chat Coverage",
        description:
          "CallSphere handles both phone calls and website chat with shared context. Dialzara is phone-only, leaving website visitors without AI assistance.",
        icon: MessageSquare,
      },
      {
        title: "Enterprise Compliance",
        description:
          "CallSphere offers HIPAA, SOC 2, and GDPR/CPRA compliance. Dialzara does not offer these certifications, excluding it from healthcare, legal, and financial use cases.",
        icon: Shield,
      },
      {
        title: "57+ Languages",
        description:
          "CallSphere supports 57+ languages for businesses with diverse customer bases. Dialzara operates primarily in English.",
        icon: Globe,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat, all integrations, and compliance included.",
      competitor:
        "Plans start at $29/mo for basic call answering with limited minutes. Usage overages apply. Higher tiers add more features and minutes.",
      detail:
        "Dialzara\u2019s $29/mo entry price targets solopreneurs and very small businesses. For businesses that need chat support, multilingual coverage, HIPAA compliance, or CRM integrations, CallSphere\u2019s $149/mo plan provides significantly more value.",
    },
    verdict:
      "CallSphere is the better choice for businesses that need a comprehensive AI communications platform with compliance, multilingual support, and growth potential. Dialzara works for solopreneurs and very small businesses that just need a basic AI phone receptionist at the lowest possible price.",
    ctaHeadline: "Beyond Basic Answering",
    ctaDescription:
      "CallSphere gives you an AI communications platform, not just a phone receptionist. Try the live demo and experience the difference.",
  },

  "callsphere-vs-voiceflow": {
    slug: "callsphere-vs-voiceflow",
    competitorName: "Voiceflow",
    competitorShortName: "Voiceflow",
    metaTitle:
      "CallSphere vs Voiceflow: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Voiceflow for AI voice agents. CallSphere offers ready-to-deploy voice + chat agents vs Voiceflow's conversational AI design platform that requires building.",
    headline: "CallSphere vs Voiceflow: AI Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s turnkey AI voice and chat agents with Voiceflow\u2019s conversational AI design and prototyping platform.",
    overview: {
      callsphere:
        "CallSphere is a turnkey AI voice and chat agent platform that deploys production-ready agents in 3\u20135 days. It includes HIPAA compliance, 57+ languages, live demos, CRM integrations, payment processing, and transparent pricing from $149/mo \u2014 all without writing code.",
      competitor:
        "Voiceflow is a collaborative design platform for building conversational AI agents. It provides a visual canvas for designing chat and voice flows, but focuses on the design and prototyping phase rather than production deployment. Voiceflow is primarily a chatbot builder that requires integration work to connect to telephony for voice calls.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents (Phone)", callsphere: true, competitor: "Requires integration" },
      { feature: "Chat Agents", callsphere: true, competitor: true },
      {
        feature: "Built-In Telephony",
        callsphere: true,
        competitor: false,
      },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "Free (limited) / $50+/mo",
      },
      { feature: "No-Code Setup", callsphere: true, competitor: true },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "LLM-dependent",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Via API" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: "Build your own" },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Production Deployment",
        callsphere: "Included",
        competitor: "Requires additional tooling",
      },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Weeks (design + integration)",
      },
      {
        feature: "Dedicated Support",
        callsphere: true,
        competitor: "Community + paid plans",
      },
    ],
    differentiators: [
      {
        title: "Deploy vs. Design",
        description:
          "CallSphere deploys production-ready voice and chat agents in days. Voiceflow is a design tool \u2014 you design conversations visually, but still need to build integrations, connect telephony, and handle deployment yourself.",
        icon: Zap,
      },
      {
        title: "Built-In Telephony",
        description:
          "CallSphere includes phone number provisioning, call routing, and telephony infrastructure. Voiceflow has no built-in telephony \u2014 voice calls require connecting external providers like Twilio through custom integrations.",
        icon: Mic,
      },
      {
        title: "Enterprise Compliance Included",
        description:
          "CallSphere provides HIPAA compliance with a signed BAA and SOC 2 alignment on all plans. Voiceflow does not offer HIPAA compliance, limiting its use in regulated industries.",
        icon: Shield,
      },
      {
        title: "All-Inclusive Pricing",
        description:
          "CallSphere\u2019s flat monthly pricing includes everything: voice, chat, telephony, integrations, and compliance. Voiceflow\u2019s pricing covers only the design platform \u2014 telephony, hosting, and integrations are additional costs.",
        icon: DollarSign,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents, telephony, integrations, and compliance all included.",
      competitor:
        "Free sandbox tier with limited features. Pro plans from $50/mo for the design platform. Telephony, hosting, and production deployment are separate costs that can add $100\u2013$500+/mo depending on scale.",
      detail:
        "Voiceflow\u2019s $50/mo Pro plan looks affordable, but it only covers the design platform. Adding Twilio for telephony ($0.01\u2013$0.02/min), hosting, and production infrastructure can push total costs to $200\u2013$600+/mo \u2014 plus ongoing engineering time. CallSphere includes everything at a predictable price.",
    },
    verdict:
      "CallSphere is the clear choice for businesses that want production-ready AI voice and chat agents without managing design tools, telephony integrations, and deployment infrastructure. Voiceflow is a strong prototyping and design tool for teams that want to visually design conversational flows, but it requires significant additional work to deploy voice agents in production.",
    ctaHeadline: "From Zero to Live in Days",
    ctaDescription:
      "Stop designing and start deploying. CallSphere gives you production-ready AI voice and chat agents with telephony included. Try the live demo now.",
  },

  "callsphere-vs-my-ai-front-desk": {
    slug: "callsphere-vs-my-ai-front-desk",
    competitorName: "My AI Front Desk",
    competitorShortName: "My AI Front Desk",
    metaTitle:
      "CallSphere vs My AI Front Desk: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and My AI Front Desk for AI phone answering. CallSphere offers voice + chat, 57+ languages, and HIPAA compliance vs My AI Front Desk's basic AI receptionist.",
    headline: "CallSphere vs My AI Front Desk: AI Receptionist Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s enterprise AI voice and chat platform with My AI Front Desk\u2019s AI receptionist for small businesses.",
    overview: {
      callsphere:
        "CallSphere is a complete AI voice and chat agent platform with enterprise compliance, 57+ languages, transparent pricing from $149/mo, and live demos. It handles complex workflows including appointment scheduling, payment processing, CRM integration, and multi-channel communications.",
      competitor:
        "My AI Front Desk is an AI phone receptionist designed for small businesses like salons, dental offices, and law firms. It answers calls, schedules appointments, and sends text messages. The service focuses on simplicity and affordability for businesses that want to stop missing calls.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents", callsphere: true, competitor: true },
      { feature: "Chat Agents", callsphere: true, competitor: false },
      { feature: "Voice + Chat Unified", callsphere: true, competitor: false },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "$65/mo",
      },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "English + Spanish",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: "Basic" },
      { feature: "Appointment Scheduling", callsphere: true, competitor: true },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      { feature: "SMS Follow-Up", callsphere: true, competitor: true },
      {
        feature: "Custom Workflows",
        callsphere: true,
        competitor: "Limited",
      },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "Same day",
      },
      {
        feature: "Enterprise Features",
        callsphere: true,
        competitor: false,
      },
    ],
    differentiators: [
      {
        title: "Platform vs. Receptionist",
        description:
          "CallSphere is a full AI communications platform with voice, chat, CRM sync, payments, and compliance. My AI Front Desk is a phone receptionist that answers calls and books appointments. Businesses that need more than basic call answering will quickly outgrow My AI Front Desk.",
        icon: Zap,
      },
      {
        title: "57+ Languages vs. Two",
        description:
          "CallSphere supports 57+ languages for businesses serving diverse communities. My AI Front Desk supports English and Spanish only, excluding large portions of the global market.",
        icon: Globe,
      },
      {
        title: "HIPAA Compliance for Healthcare",
        description:
          "CallSphere provides HIPAA compliance with a signed BAA, making it suitable for healthcare practices. My AI Front Desk targets dental and medical offices but does not offer HIPAA compliance, creating regulatory risk.",
        icon: Shield,
      },
      {
        title: "Voice + Chat Coverage",
        description:
          "CallSphere handles phone calls and website chat with shared customer context. My AI Front Desk is phone-only, leaving website visitors without AI assistance.",
        icon: MessageSquare,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat, all integrations, and HIPAA compliance included.",
      competitor:
        "Plans start at $65/mo for basic call answering and scheduling. Per-minute overages may apply on higher volume. Chat not included.",
      detail:
        "My AI Front Desk\u2019s $65/mo price is attractive for very small businesses. However, businesses that need chat support, HIPAA compliance, multilingual coverage, or advanced integrations will find CallSphere\u2019s $149/mo Starter plan provides much greater value.",
    },
    verdict:
      "CallSphere is the better choice for businesses that need a complete, compliant AI communications platform with growth potential. My AI Front Desk works for very small businesses that just need a basic AI phone receptionist at a low price point, but its limited features, lack of HIPAA compliance, and voice-only approach constrain its usefulness.",
    ctaHeadline: "More Than a Receptionist",
    ctaDescription:
      "CallSphere gives you a full AI communications platform with voice, chat, compliance, and 57+ languages. See the difference with a live demo.",
  },

  "callsphere-vs-lindy-ai": {
    slug: "callsphere-vs-lindy-ai",
    competitorName: "Lindy.ai",
    competitorShortName: "Lindy",
    metaTitle:
      "CallSphere vs Lindy.ai: AI Voice Agent Comparison 2026 | CallSphere",
    metaDescription:
      "Compare CallSphere and Lindy.ai for AI voice agents. CallSphere offers purpose-built voice + chat agents vs Lindy.ai's general-purpose AI assistant platform.",
    headline: "CallSphere vs Lindy.ai: AI Agent Comparison 2026",
    subheadline:
      "Compare CallSphere\u2019s purpose-built AI voice and chat platform with Lindy.ai\u2019s general-purpose AI assistant builder.",
    overview: {
      callsphere:
        "CallSphere is a purpose-built AI voice and chat agent platform designed specifically for business communications. It deploys in 3\u20135 days with HIPAA compliance, 57+ languages, transparent pricing from $149/mo, and live demos. Every feature is optimized for handling customer calls and chats.",
      competitor:
        "Lindy.ai is a general-purpose AI assistant platform that lets users create AI agents for various tasks \u2014 email drafting, meeting scheduling, data extraction, customer support, and more. While Lindy can handle phone calls through integrations, voice is one of many capabilities rather than its core focus.",
    },
    featureTable: [
      { feature: "Live Interactive Demo", callsphere: true, competitor: false },
      { feature: "Voice Agents (Phone)", callsphere: true, competitor: "Via integration" },
      { feature: "Chat Agents", callsphere: true, competitor: true },
      { feature: "Purpose-Built for Voice", callsphere: true, competitor: false },
      {
        feature: "Starting Price",
        callsphere: "$149/mo",
        competitor: "$49/mo",
      },
      { feature: "HIPAA Compliant (BAA)", callsphere: true, competitor: false },
      {
        feature: "Languages Supported",
        callsphere: "57+",
        competitor: "LLM-dependent",
      },
      { feature: "CRM Integrations", callsphere: true, competitor: true },
      { feature: "Appointment Scheduling", callsphere: true, competitor: true },
      { feature: "Payment Processing", callsphere: true, competitor: false },
      {
        feature: "Built-In Telephony",
        callsphere: true,
        competitor: false,
      },
      { feature: "Call Analytics & Transcripts", callsphere: true, competitor: "Limited" },
      {
        feature: "Setup Time",
        callsphere: "3\u20135 days",
        competitor: "1\u20137 days",
      },
      {
        feature: "Dedicated Support",
        callsphere: true,
        competitor: "Email + chat",
      },
    ],
    differentiators: [
      {
        title: "Purpose-Built vs. General Purpose",
        description:
          "CallSphere is built from the ground up for business voice and chat communications. Every feature \u2014 from call routing to transcription to CRM sync \u2014 is optimized for customer interactions. Lindy.ai is a general-purpose AI agent platform where voice calling is an add-on capability, not the core product.",
        icon: Mic,
      },
      {
        title: "Built-In Telephony",
        description:
          "CallSphere includes phone number provisioning, call routing, recording, and transcription as core features. Lindy.ai requires connecting external telephony providers to handle phone calls, adding complexity and cost.",
        icon: Zap,
      },
      {
        title: "Healthcare-Grade Compliance",
        description:
          "CallSphere provides HIPAA compliance with a signed BAA, SOC 2 alignment, and GDPR/CPRA compliance. Lindy.ai does not offer HIPAA compliance, limiting its use in regulated industries.",
        icon: Shield,
      },
      {
        title: "Voice-Optimized Analytics",
        description:
          "CallSphere provides call-specific analytics: sentiment analysis, intent detection, call outcomes, resolution rates, and searchable transcripts. Lindy.ai\u2019s analytics are designed for general AI tasks, not voice-specific metrics.",
        icon: BarChart3,
      },
    ],
    pricingComparison: {
      callsphere:
        "Flat monthly plans: Starter ($149/mo), Growth ($499/mo), Scale ($1,499/mo). Voice + chat agents, telephony, and compliance all included.",
      competitor:
        "Starts at $49/mo with credits for AI actions. Phone calling requires additional telephony integrations at extra cost. Higher tiers ($99\u2013$299/mo) include more credits.",
      detail:
        "Lindy.ai\u2019s $49/mo entry price covers general AI tasks, but adding telephony for voice calls and scaling credit usage can push costs to $200\u2013$500+/mo. CallSphere\u2019s $149/mo Starter plan includes purpose-built voice + chat with telephony at a predictable price.",
    },
    verdict:
      "CallSphere is the better choice for businesses that need a dedicated AI voice and chat platform with enterprise compliance and built-in telephony. Lindy.ai is useful for teams that want a general-purpose AI assistant for multiple tasks beyond just phone calls. For voice-first businesses, CallSphere\u2019s purpose-built approach delivers superior call quality, analytics, and compliance.",
    ctaHeadline: "Purpose-Built Beats General-Purpose",
    ctaDescription:
      "When voice calls matter to your business, you need a platform built for voice. Try CallSphere\u2019s live demo and hear the difference purpose-built makes.",
  },
};

/* ------------------------------------------------------------------ */
/*  Static Params & Metadata                                           */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const data = comparisons[params.slug];
  if (!data) return {};

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: `https://callsphere.tech/compare/${data.slug}`,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `https://callsphere.tech/compare/${data.slug}`,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: render a cell value as icon or text                        */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <CheckCircle2
        className="mx-auto h-5 w-5 text-green-500"
        aria-label="Yes"
      />
    );
  }
  if (value === false) {
    return (
      <XCircle className="mx-auto h-5 w-5 text-slate-300" aria-label="No" />
    );
  }
  return (
    <span className="text-sm font-medium text-slate-700">{value}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ComparePage({
  params,
}: {
  params: { slug: string };
}) {
  const data = comparisons[params.slug];
  if (!data) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Compare", url: "https://callsphere.tech/compare" },
          {
            name: `CallSphere vs ${data.competitorShortName}`,
            url: `https://callsphere.tech/compare/${data.slug}`,
          },
        ]}
      />

      <Nav />

      <main id="main" className="relative">
        {/* -------------------------------------------------------- */}
        {/*  Hero                                                     */}
        {/* -------------------------------------------------------- */}
        <section className="section-shell pt-16 pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <BarChart3 className="h-4 w-4" />
              Comparison
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {data.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
              {data.subheadline}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/industries"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Try a Live Demo
                <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  Overview                                                 */}
        {/* -------------------------------------------------------- */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Overview
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                How do they compare?
              </h2>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {/* CallSphere card */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-white p-8 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Recommended
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  CallSphere
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {data.overview.callsphere}
                </p>
              </div>
              {/* Competitor card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="mt-7 text-xl font-bold text-slate-900">
                  {data.competitorName}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {data.overview.competitor}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  Feature Comparison Table                                 */}
        {/* -------------------------------------------------------- */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Feature Comparison
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Side-by-side feature breakdown
              </h2>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div className="text-sm font-semibold text-slate-700">
                  Feature
                </div>
                <div className="text-center text-sm font-semibold text-indigo-700">
                  CallSphere
                </div>
                <div className="text-center text-sm font-semibold text-slate-700">
                  {data.competitorShortName}
                </div>
              </div>

              {/* Table rows */}
              {data.featureTable.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-3 items-center px-6 py-4 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  } ${
                    i < data.featureTable.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">
                    {row.feature}
                  </div>
                  <div className="text-center">
                    <CellValue value={row.callsphere} />
                  </div>
                  <div className="text-center">
                    <CellValue value={row.competitor} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  Key Differentiators                                      */}
        {/* -------------------------------------------------------- */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Key Differentiators
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Where CallSphere pulls ahead
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {data.differentiators.map((diff) => {
                const DiffIcon = diff.icon;
                return (
                  <div
                    key={diff.title}
                    className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <DiffIcon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">
                      {diff.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {diff.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  Pricing Comparison                                       */}
        {/* -------------------------------------------------------- */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Pricing Comparison
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What will it actually cost?
              </h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {/* CallSphere pricing */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    CallSphere Pricing
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {data.pricingComparison.callsphere}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    $149/mo Starter
                  </span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    $499/mo Growth
                  </span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    $1,499/mo Scale
                  </span>
                </div>
              </div>

              {/* Competitor pricing */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {data.competitorShortName} Pricing
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {data.pricingComparison.competitor}
                </p>
              </div>
            </div>

            {/* Pricing detail callout */}
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm leading-relaxed text-amber-900">
                <span className="font-semibold">Bottom line:</span>{" "}
                {data.pricingComparison.detail}
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  Verdict / Summary                                        */}
        {/* -------------------------------------------------------- */}
        <section className="bg-indigo-600 py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The Verdict
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-indigo-100">
              {data.verdict}
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  CTA                                                      */}
        {/* -------------------------------------------------------- */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {data.ctaHeadline}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                {data.ctaDescription}
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/industries"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Try It Yourself
                  <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
