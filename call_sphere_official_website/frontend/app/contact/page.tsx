import { Metadata } from "next";

import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "Book a Demo | CallSphere AI Voice Agents",
    description:
        "Schedule a demo of CallSphere AI voice and chat agents. See live automation for your industry. Call (845) 388-4261.",
    alternates: {
        canonical: "https://callsphere.tech/contact",
    },
    openGraph: {
        title: "Book a Demo | CallSphere AI Voice Agents",
        description:
            "Schedule a demo of CallSphere AI voice and chat agents. See live automation for your industry.",
        url: "https://callsphere.tech/contact",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Book a Demo | CallSphere AI Voice Agents",
        description:
            "Schedule a demo of CallSphere AI voice and chat agents. See live automation for your industry.",
    },
};

export default function ContactPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "Contact", url: "https://callsphere.tech/contact" },
                ]}
            />
            <Nav />
            <main id="main" className="relative pt-8">
                <ContactSection />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
