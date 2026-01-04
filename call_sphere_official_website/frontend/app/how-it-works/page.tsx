import { Metadata } from "next";

import { HowItWorksSection } from "@/components/HowItWorksSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "How It Works - CallSphere AI Voice & Chat Agents",
    description:
        "Learn how CallSphere AI agents work: from initial contact to order completion, see how our voice and chat automation streamlines your business.",
};

export default function HowItWorksPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative pt-8">
                <HowItWorksSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
