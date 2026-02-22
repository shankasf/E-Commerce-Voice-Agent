import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "CallSphere vs Competitors | AI Voice Agent Comparisons",
  description:
    "See how CallSphere compares to Bland.ai, PolyAI, and Smith.ai. Side-by-side feature, pricing, and capability comparisons for AI voice agents.",
  alternates: {
    canonical: "https://callsphere.tech/compare",
  },
  openGraph: {
    title: "CallSphere vs Competitors | AI Voice Agent Comparisons",
    description:
      "See how CallSphere compares to Bland.ai, PolyAI, and Smith.ai. Side-by-side feature and pricing comparisons.",
    url: "https://callsphere.tech/compare",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CallSphere vs Competitors | AI Voice Agent Comparisons",
    description:
      "See how CallSphere compares to Bland.ai, PolyAI, and Smith.ai for AI voice agents.",
  },
};

const comparisons = [
  {
    slug: "callsphere-vs-bland-ai",
    competitor: "Bland.ai",
    tagline: "Turnkey platform vs. developer API",
    highlights: [
      "Live interactive demo (Bland.ai has none)",
      "Voice + Chat unified (Bland.ai is voice-only)",
      "Transparent pricing from $149/mo",
      "No-code setup, go live in 3-5 days",
    ],
  },
  {
    slug: "callsphere-vs-vapi",
    competitor: "Vapi.ai",
    tagline: "Production-ready vs. build-it-yourself",
    highlights: [
      "Deploy in days, not months of engineering",
      "Flat pricing vs. per-minute API costs",
      "Voice + Chat included (Vapi is voice-only)",
      "HIPAA compliant with signed BAA",
    ],
  },
  {
    slug: "callsphere-vs-synthflow",
    competitor: "Synthflow",
    tagline: "Enterprise compliance vs. basic no-code",
    highlights: [
      "HIPAA, SOC 2, GDPR compliance included",
      "57+ languages vs. 12+",
      "Flat pricing vs. per-minute charges",
      "Voice + Chat unified platform",
    ],
  },
  {
    slug: "callsphere-vs-retell-ai",
    competitor: "Retell AI",
    tagline: "Complete platform vs. voice API",
    highlights: [
      "No engineering required to deploy",
      "CRM, scheduling, payments built in",
      "Predictable monthly pricing",
      "Voice + Chat in one platform",
    ],
  },
  {
    slug: "callsphere-vs-polyai",
    competitor: "PolyAI",
    tagline: "SMB-friendly vs. enterprise-only",
    highlights: [
      "Plans from $149/mo (PolyAI requires custom quote)",
      "Live demo available (PolyAI requires sales call)",
      "57+ languages supported",
      "Voice + Chat in one platform",
    ],
  },
  {
    slug: "callsphere-vs-smith-ai",
    competitor: "Smith.ai",
    tagline: "AI-native vs. human-assisted",
    highlights: [
      "True AI voice agents, not human receptionists",
      "Unlimited call minutes (Smith.ai charges per call)",
      "24/7 availability without per-minute fees",
      "Full CRM and payment integrations",
    ],
  },
  {
    slug: "callsphere-vs-goodcall",
    competitor: "Goodcall",
    tagline: "Full platform vs. basic answering",
    highlights: [
      "57+ languages vs. English only",
      "HIPAA compliance included",
      "Voice + Chat agents in one platform",
      "Enterprise features for growing businesses",
    ],
  },
  {
    slug: "callsphere-vs-dialzara",
    competitor: "Dialzara",
    tagline: "Communications platform vs. virtual receptionist",
    highlights: [
      "Full AI platform vs. basic receptionist",
      "HIPAA, SOC 2, GDPR compliance",
      "57+ languages vs. English only",
      "Voice + Chat with CRM integrations",
    ],
  },
  {
    slug: "callsphere-vs-voiceflow",
    competitor: "Voiceflow",
    tagline: "Deploy vs. design",
    highlights: [
      "Production-ready with built-in telephony",
      "No integration work needed",
      "HIPAA compliance included",
      "All-inclusive pricing, no hidden costs",
    ],
  },
  {
    slug: "callsphere-vs-my-ai-front-desk",
    competitor: "My AI Front Desk",
    tagline: "Enterprise platform vs. basic receptionist",
    highlights: [
      "HIPAA compliance (critical for healthcare)",
      "57+ languages vs. English + Spanish",
      "Voice + Chat unified platform",
      "Advanced CRM and payment integrations",
    ],
  },
  {
    slug: "callsphere-vs-lindy-ai",
    competitor: "Lindy.ai",
    tagline: "Purpose-built voice vs. general-purpose AI",
    highlights: [
      "Built specifically for voice + chat",
      "Built-in telephony infrastructure",
      "Voice-optimized analytics and transcripts",
      "HIPAA and SOC 2 compliance",
    ],
  },
  {
    slug: "ai-voice-agent-vs-ivr-chatbot",
    competitor: "IVR & Chatbot",
    tagline: "4-way technology comparison",
    highlights: [
      "AI Voice Agent vs IVR vs Chatbot vs Human",
      "15 capability dimensions compared",
      "Cost, latency, and compliance analysis",
      "When to use each technology",
    ],
  },
];

export default function ComparePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Compare", url: "https://callsphere.tech/compare" },
        ]}
      />
      <Nav />
      <main id="main" className="relative">
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              How CallSphere Compares
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Choosing an AI voice agent platform? See how CallSphere stacks up
              against the competition on features, pricing, and ease of use.
            </p>
          </div>
        </section>

        <section className="section-stack pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid gap-8">
              {comparisons.map((comp) => (
                <Link
                  key={comp.slug}
                  href={`/compare/${comp.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        CallSphere vs {comp.competitor}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {comp.tagline}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-indigo-600" />
                  </div>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {comp.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 group-hover:underline">
                    See full comparison
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
