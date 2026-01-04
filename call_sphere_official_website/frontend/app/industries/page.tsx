import { Metadata } from "next";

import { IndustriesSection } from "@/components/IndustriesSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "Industries - CallSphere AI Voice & Chat Agents",
    description:
        "CallSphere serves Property Management, Healthcare Clinics, IT MSPs, and Logistics businesses with AI voice and chat agents that handle complex workflows—from maintenance triage and appointment scheduling to ticket creation and order status.",
};

export default function IndustriesPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative">
                <IndustriesSection />
                <CTA />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
