import { Metadata } from "next";

import { PricingSection } from "@/components/PricingSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { FAQSection } from "@/components/FAQSection";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "Pricing - CallSphere AI Voice & Chat Agents",
    description:
        "Transparent pricing for CallSphere AI agents. Choose from Starter, Growth, or Enterprise plans to automate your voice and chat customer interactions.",
};

export default function PricingPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative">
                <PricingSection />
                <FAQSection />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
