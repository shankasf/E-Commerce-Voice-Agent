import { AffiliateBanner } from "@/components/AffiliateBanner";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { IndustriesSection } from "@/components/IndustriesSection";
import { LiveDemoSection } from "@/components/LiveDemoSection";
import { Nav } from "@/components/Nav";
import { VoiceAgentBanner } from "@/components/VoiceAgentBanner";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export default function HomePage() {
  return (
    <>
      <AffiliateBanner />
      <Nav />
      <div className="mx-auto max-w-4xl px-4">
        <VoiceAgentBanner />
      </div>
      <main id="main" className="relative">
        <Hero />
        <LiveDemoSection />
        <IndustriesSection />
        <FeaturesSection />
        <CTA />
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
