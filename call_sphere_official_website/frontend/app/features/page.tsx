import { Metadata } from "next";

import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "AI Voice & Chat Agent Features | CallSphere Platform",
    description:
        "Explore CallSphere features: natural voice AI, 57+ languages, secure payments, CRM integrations, real-time analytics, and enterprise security. Book a demo.",
    alternates: {
        canonical: "https://callsphere.tech/features",
    },
    openGraph: {
        title: "AI Voice & Chat Agent Features | CallSphere Platform",
        description:
            "Explore CallSphere features: natural voice AI, 57+ languages, secure payments, CRM integrations, real-time analytics, and enterprise security.",
        url: "https://callsphere.tech/features",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Voice & Chat Agent Features | CallSphere Platform",
        description:
            "Explore CallSphere features: natural voice AI, 57+ languages, secure payments, CRM integrations, and enterprise security.",
    },
};

export default function FeaturesPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "Features", url: "https://callsphere.tech/features" },
                ]}
            />
            <FAQPageJsonLd
                items={[
                    {
                        question: "Does CallSphere support multiple languages?",
                        answer: "Yes. CallSphere AI agents support 57+ languages with natural-sounding conversations, including English, Spanish, French, German, Mandarin, Hindi, Arabic, and Portuguese.",
                    },
                    {
                        question: "Is CallSphere HIPAA compliant?",
                        answer: "Yes. CallSphere offers HIPAA-compliant deployments with signed BAAs, encrypted PHI handling, audit logging, and role-based access controls for healthcare organizations.",
                    },
                    {
                        question: "What CRMs does CallSphere integrate with?",
                        answer: "CallSphere integrates with Salesforce, HubSpot, Zoho CRM, Pipedrive, Zendesk, Freshdesk, Shopify, Stripe, Square, Google Calendar, Calendly, Monday.com, and more.",
                    },
                    {
                        question: "Can CallSphere process payments during calls?",
                        answer: "Yes. CallSphere AI agents securely collect payment information and process transactions through Stripe or Square during voice calls and chat, with full PCI-DSS compliance.",
                    },
                ]}
            />
            <Nav />
            <main id="main" className="relative">
                {/* GEO Answer Capsules — feature queries */}
                <section className="section-shell pt-16 pb-0">
                    <div className="mx-auto max-w-4xl">
                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            CallSphere AI Voice &amp; Chat Agent Features
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-slate-600">
                            CallSphere provides enterprise-grade AI agents for phone and chat that include natural language understanding,
                            57+ language support, secure payment processing via Stripe, CRM integrations with Salesforce and HubSpot,
                            real-time analytics dashboards, HIPAA-compliant data handling, and intelligent human escalation.
                        </p>

                        <div className="mt-10 grid gap-6 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Does CallSphere support multiple languages?
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Yes. CallSphere AI agents support 57+ languages with natural-sounding conversations,
                                    including English, Spanish, French, German, Mandarin, Hindi, Arabic, and Portuguese.
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Is CallSphere HIPAA compliant?
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Yes. CallSphere offers HIPAA-compliant deployments with signed BAAs,
                                    encrypted PHI handling, audit logging, and role-based access controls for healthcare organizations.
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    What CRMs does CallSphere integrate with?
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    CallSphere integrates with Salesforce, HubSpot, Zoho CRM, Pipedrive, Zendesk, Freshdesk,
                                    Shopify, Stripe, Square, Google Calendar, Calendly, Monday.com, and more.
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Can CallSphere process payments during calls?
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Yes. CallSphere AI agents securely collect payment information and process transactions
                                    through Stripe or Square during voice calls and chat, with full PCI-DSS compliance.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <FeaturesSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
