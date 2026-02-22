import { Metadata } from "next";

import { HowItWorksSection } from "@/components/HowItWorksSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd, HowToJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "How AI Voice Agents Work | 3-Step Setup | CallSphere",
    description:
        "See how CallSphere AI agents understand intent, build carts, process payments, and confirm orders -- all via voice or chat. Live in 3-5 days.",
    alternates: {
        canonical: "https://callsphere.tech/how-it-works",
    },
    openGraph: {
        title: "How AI Voice Agents Work | 3-Step Setup | CallSphere",
        description:
            "See how CallSphere AI agents understand intent, build carts, process payments, and confirm orders. Live in 3-5 days.",
        url: "https://callsphere.tech/how-it-works",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "How AI Voice Agents Work | 3-Step Setup | CallSphere",
        description:
            "See how CallSphere AI agents understand intent, build carts, process payments, and confirm orders. Live in 3-5 days.",
    },
};

export default function HowItWorksPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "How It Works", url: "https://callsphere.tech/how-it-works" },
                ]}
            />
            <HowToJsonLd
                steps={[
                    {
                        name: "Discover",
                        text: "Voice or chat agent understands customer intent and queries your product catalog semantically using natural language processing.",
                    },
                    {
                        name: "Decide",
                        text: "AI applies filters (brand, size, price, availability) and builds the cart across any channel - voice or chat.",
                    },
                    {
                        name: "Complete",
                        text: "Checkout, payment handoff, and confirmation delivered via voice, chat, SMS, or email. Fully automated end-to-end.",
                    },
                ]}
            />
            <Nav />
            <main id="main" className="relative pt-8">
                {/* GEO Answer Capsule — "How does CallSphere work?" */}
                <section className="section-shell pb-0">
                    <div className="mx-auto max-w-4xl">
                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            How CallSphere AI Agents Work
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-slate-600">
                            CallSphere deploys in three steps: (1) configure your AI agent with your business knowledge base,
                            phone numbers, and integrations; (2) the AI understands customer intent using natural language processing
                            and takes actions like booking appointments, processing orders, or collecting payments;
                            (3) monitor performance through real-time analytics and refine over time. Most businesses go live in 3–5 days.
                        </p>
                    </div>
                </section>

                <HowItWorksSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
