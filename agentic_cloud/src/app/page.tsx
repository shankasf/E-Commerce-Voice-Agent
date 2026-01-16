import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { DemoSection } from "@/components/sections/DemoSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { ServicesPreviewSection } from "@/components/sections/ServicesPreviewSection";
import { DeveloperExperienceSection } from "@/components/sections/DeveloperExperienceSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CTASection } from "@/components/sections/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <HowItWorksSection />
      <ServicesPreviewSection />
      <DeveloperExperienceSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
