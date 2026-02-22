import { Metadata } from "next";

import { PricingSection } from "@/components/PricingSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { FAQSection } from "@/components/FAQSection";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "AI Voice Agent Pricing from $149/mo - CallSphere",
    description:
        "Transparent pricing for CallSphere AI agents. Choose from Starter ($149/mo), Growth ($499/mo), or Scale ($1,499/mo) plans to automate voice and chat customer interactions.",
    alternates: {
        canonical: "https://callsphere.tech/pricing",
    },
    openGraph: {
        title: "AI Voice Agent Pricing from $149/mo - CallSphere",
        description:
            "Transparent pricing for CallSphere AI agents. Choose from Starter ($149/mo), Growth ($499/mo), or Scale ($1,499/mo) plans.",
        url: "https://callsphere.tech/pricing",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Voice Agent Pricing from $149/mo - CallSphere",
        description:
            "Transparent pricing for CallSphere AI agents. Starter ($149/mo), Growth ($499/mo), or Scale ($1,499/mo).",
    },
};

export default function PricingPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "Pricing", url: "https://callsphere.tech/pricing" },
                ]}
            />
            <ProductJsonLd
                name="CallSphere Starter Plan"
                description="AI voice and chat agents for small teams. Includes core automation features."
                price="149"
            />
            <ProductJsonLd
                name="CallSphere Growth Plan"
                description="Advanced AI agents with analytics, integrations, and priority support for growing businesses."
                price="499"
            />
            <ProductJsonLd
                name="CallSphere Scale Plan"
                description="Enterprise-grade AI voice and chat agents with custom integrations, dedicated support, and SLA guarantees."
                price="1499"
            />
            <Nav />
            <main id="main" className="relative">
                {/* GEO Answer Capsule — pricing queries */}
                <section className="section-shell pt-16 pb-0">
                    <div className="mx-auto max-w-4xl">
                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            CallSphere Pricing
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-slate-600">
                            CallSphere offers three transparent pricing tiers: Starter at $149/month (2,000 interactions),
                            Growth at $499/month (10,000 interactions), and Scale at $1,499/month (50,000 interactions).
                            All plans include AI voice and chat agents, secure payment processing, and real-time analytics.
                            Annual billing saves 15%.
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                                <p className="text-sm font-medium text-slate-500">Starter</p>
                                <p className="mt-1 text-3xl font-bold text-slate-900">$149<span className="text-base font-normal text-slate-500">/mo</span></p>
                                <p className="mt-1 text-xs text-slate-500">2,000 interactions</p>
                            </div>
                            <div className="rounded-xl border-2 border-indigo-500 bg-white p-5 text-center">
                                <p className="text-sm font-medium text-indigo-600">Growth</p>
                                <p className="mt-1 text-3xl font-bold text-slate-900">$499<span className="text-base font-normal text-slate-500">/mo</span></p>
                                <p className="mt-1 text-xs text-slate-500">10,000 interactions</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                                <p className="text-sm font-medium text-slate-500">Scale</p>
                                <p className="mt-1 text-3xl font-bold text-slate-900">$1,499<span className="text-base font-normal text-slate-500">/mo</span></p>
                                <p className="mt-1 text-xs text-slate-500">50,000 interactions</p>
                            </div>
                        </div>
                    </div>
                </section>

                <PricingSection />
                <FAQSection />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
