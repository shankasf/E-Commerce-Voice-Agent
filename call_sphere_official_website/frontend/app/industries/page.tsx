import { Metadata } from "next";

import { IndustriesSection } from "@/components/IndustriesSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "AI Voice Agents by Industry | HVAC, Healthcare, IT, Logistics",
    description:
        "See how CallSphere AI agents handle HVAC service calls, healthcare appointments, IT ticket triage, and logistics tracking. Try live industry demos.",
    alternates: {
        canonical: "https://callsphere.tech/industries",
    },
    openGraph: {
        title: "AI Voice Agents by Industry | HVAC, Healthcare, IT, Logistics",
        description:
            "See how CallSphere AI agents handle HVAC service calls, healthcare appointments, IT ticket triage, and logistics tracking.",
        url: "https://callsphere.tech/industries",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Voice Agents by Industry | HVAC, Healthcare, IT, Logistics",
        description:
            "See how CallSphere AI agents handle HVAC service calls, healthcare appointments, IT ticket triage, and logistics tracking.",
    },
};

export default function IndustriesPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "Industries", url: "https://callsphere.tech/industries" },
                ]}
            />
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
