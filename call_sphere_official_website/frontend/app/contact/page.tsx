import { Metadata } from "next";

import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "Contact Us - CallSphere AI Voice & Chat Agents",
    description:
        "Get in touch with CallSphere. Book a demo, request pricing, or ask questions about our AI voice and chat agent solutions.",
};

export default function ContactPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative pt-8">
                <ContactSection />
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
