import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Shield,
  Globe,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { IndustriesSection } from "@/components/IndustriesSection";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Try AI Voice Agent Demo - Talk to AI Now | CallSphere",
  description:
    "Try CallSphere AI voice agents live -- no signup required. Talk to industry-specific AI agents for HVAC, healthcare, IT support, and logistics. Experience the future of customer calls.",
  alternates: {
    canonical: "https://callsphere.tech/demo",
  },
  openGraph: {
    title: "Try AI Voice Agent Demo - Talk to AI Now | CallSphere",
    description:
      "Try CallSphere AI voice agents live -- no signup required. Talk to industry-specific AI agents instantly.",
    url: "https://callsphere.tech/demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Try AI Voice Agent Demo - Talk to AI Now | CallSphere",
    description:
      "Try CallSphere AI voice agents live -- no signup required. Talk to industry-specific AI agents instantly.",
  },
};

const features = [
  {
    icon: Mic,
    title: "Real Voice Conversation",
    description:
      "Not a recording or chatbot. You're talking to a live AI voice agent that understands natural language.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "TLS encryption, SOC 2 aligned, HIPAA with BAA available. Your demo conversations are secure.",
  },
  {
    icon: Globe,
    title: "57+ Languages",
    description:
      "Try speaking in any of 57+ supported languages. The AI responds naturally in your language.",
  },
  {
    icon: Clock,
    title: "No Signup Required",
    description:
      "Click a button and start talking. No email, no credit card, no sales pitch. Just try it.",
  },
  {
    icon: Zap,
    title: "Industry-Specific",
    description:
      "Each demo agent is trained for a specific industry -- HVAC, healthcare, IT support, or logistics.",
  },
  {
    icon: CheckCircle2,
    title: "Full Capabilities",
    description:
      "Schedule appointments, create tickets, process orders -- see the full range of what AI voice agents can do.",
  },
];

export default function DemoPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Live Demo", url: "https://callsphere.tech/demo" },
        ]}
      />
      <Nav />
      <main id="main" className="relative">
        {/* Hero */}
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-700">
                AI Agents Online Now
              </span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Talk to an AI Voice Agent Right Now
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              No signup. No credit card. No sales pitch. Just click a button
              below and start a real conversation with our AI voice agent.
              Experience what your customers will experience.
            </p>
          </div>
        </section>

        {/* Live Demo Section - reuses IndustriesSection which has the voice buttons */}
        <IndustriesSection />

        {/* What You'll Experience */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What makes this demo different
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Most AI voice agent companies hide behind "book a demo" forms.
                We let you try it yourself, right now.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Try Scenarios */}
        <section className="section-stack bg-slate-50 py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Things to try during your demo
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">
                  HVAC Services
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>&quot;My AC stopped working and it&apos;s 95 degrees&quot;</li>
                  <li>&quot;I need to schedule a furnace inspection&quot;</li>
                  <li>&quot;What&apos;s the cost for a duct cleaning?&quot;</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">
                  Healthcare
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>&quot;I need to schedule an appointment with Dr. Smith&quot;</li>
                  <li>&quot;I need to reschedule my appointment tomorrow&quot;</li>
                  <li>&quot;Do you accept Blue Cross Blue Shield?&quot;</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">
                  IT Support
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>&quot;I forgot my password and I&apos;m locked out&quot;</li>
                  <li>&quot;My VPN isn&apos;t connecting&quot;</li>
                  <li>&quot;I need to check on ticket #12345&quot;</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">
                  Logistics
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>&quot;Where is my order?&quot;</li>
                  <li>&quot;I received the wrong item&quot;</li>
                  <li>&quot;I need to reschedule my delivery&quot;</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Ready to deploy AI voice agents for your business?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Go from demo to production in 3-5 days. Plans start at
                $149/month.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Book a Demo
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
