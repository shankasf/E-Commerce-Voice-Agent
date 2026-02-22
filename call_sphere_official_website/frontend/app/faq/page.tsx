import { Metadata } from "next";

import { FAQSection, faqItems } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { FAQPageJsonLd, BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
    title: "FAQ: AI Voice Agent Questions Answered | CallSphere",
    description:
        "Get answers about CallSphere AI: pricing, HIPAA compliance, integrations, setup time, language support, and payment processing.",
    alternates: {
        canonical: "https://callsphere.tech/faq",
    },
    openGraph: {
        title: "FAQ: AI Voice Agent Questions Answered | CallSphere",
        description:
            "Get answers about CallSphere AI: pricing, HIPAA compliance, integrations, setup time, language support, and payment processing.",
        url: "https://callsphere.tech/faq",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "FAQ: AI Voice Agent Questions Answered | CallSphere",
        description:
            "Get answers about CallSphere AI: pricing, HIPAA compliance, integrations, setup time, and language support.",
    },
};

export default function FAQPage() {
    return (
        <>
            <FAQPageJsonLd items={faqItems} />
            <BreadcrumbJsonLd
                items={[
                    { name: "Home", url: "https://callsphere.tech" },
                    { name: "FAQ", url: "https://callsphere.tech/faq" },
                ]}
            />
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
