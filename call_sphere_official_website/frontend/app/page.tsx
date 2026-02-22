import { SoftwareApplicationJsonLd } from "@/components/StructuredData";
import { AffiliateBanner } from "@/components/AffiliateBanner";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { LiveDemoSection } from "@/components/LiveDemoSection";
import { StatsSection } from "@/components/StatsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { Nav } from "@/components/Nav";
import { VoiceAgentBanner } from "@/components/VoiceAgentBanner";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <AffiliateBanner />
      <Nav />
      <div className="mx-auto max-w-4xl px-4">
        <VoiceAgentBanner />
      </div>
      <main id="main" className="relative">
        <Hero />

        {/* GEO Answer Capsule — "What is CallSphere?" */}
        <section className="section-stack">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              What is CallSphere?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              CallSphere is an AI-powered voice and chat agent platform that automates customer communications for businesses.
              It answers phone calls, handles live chat, schedules appointments, processes payments, and integrates with CRMs —
              all without human intervention, 24/7, in 57+ languages.
            </p>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { term: "Channels", detail: "Voice, Chat, SMS, WhatsApp" },
                { term: "Languages", detail: "57+ with natural accents" },
                { term: "Setup time", detail: "Live in 3–5 business days" },
                { term: "Compliance", detail: "HIPAA, SOC 2, GDPR ready" },
              ].map((item) => (
                <div key={item.term} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <dt className="text-sm font-medium text-slate-500">{item.term}</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <LiveDemoSection />
        <IndustriesSection />
        <FeaturesSection />
        <StatsSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <CTA />
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
