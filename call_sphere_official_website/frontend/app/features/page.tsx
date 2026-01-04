import { Metadata } from "next";

import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "Features - CallSphere AI Voice & Chat Agents",
    description:
        "Explore CallSphere's powerful AI features: voice recognition, chat automation, order processing, appointment scheduling, and seamless CRM integrations.",
};

export default function FeaturesPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative">
                <FeaturesSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
