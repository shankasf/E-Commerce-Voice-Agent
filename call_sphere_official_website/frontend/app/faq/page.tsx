import { Metadata } from "next";

import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "FAQ - CallSphere AI Voice & Chat Agents",
    description:
        "Get answers to frequently asked questions about CallSphere AI voice and chat agents, pricing, integrations, and implementation.",
};

export default function FAQPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative pt-8">
                <FAQSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
