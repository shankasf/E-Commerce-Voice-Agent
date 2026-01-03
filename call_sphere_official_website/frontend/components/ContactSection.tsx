import { ContactForm } from "@/components/ContactForm";
import { SectionHeading } from "@/components/SectionHeading";

export function ContactSection() {
  return (
    <section id="contact" className="section-stack">
      <SectionHeading
        title="Tell us about your call volume and workflow"
        description="We will tailor a walkthrough and share how other teams automate from intent to fulfillment."
        align="center"
      />
      <div className="mt-10">
        <ContactForm />
      </div>
    </section>
  );
}
