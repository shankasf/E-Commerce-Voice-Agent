import { FAQ } from "@/components/FAQ";
import { SectionHeading } from "@/components/SectionHeading";

const faqItems = [
  {
    question: "How do you handle payments?",
    answer:
      "Secure handoff to PCI-compliant providers such as Stripe or Square—works the same for voice calls and chat.",
  },
  {
    question: "Do you support both voice and chat?",
    answer:
      "Yes! CallSphere provides AI-powered voice agents for phone calls and chatbot agents for web chat, SMS, and WhatsApp—all from one platform.",
  },
  {
    question: "Do you integrate with my catalog?",
    answer:
      "Yes. Connect via API or drop in a CSV import - CallSphere keeps it synced across voice and chat agents.",
  },
  {
    question: "Is my data safe?",
    answer:
      "All data is encrypted in transit and at rest with role-based access, detailed audit logs, and PII vaulting controls across all channels.",
  },
  {
    question: "Can I try a demo?",
    answer:
      "Absolutely - book via the form below and we will tailor a walkthrough showing both voice and chat agents for your use case.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="section-stack">
      <SectionHeading
        eyebrow="FAQ"
        title="Answers before you ask"
        description="If your question isn't covered, drop us a line—we respond within a day."
        align="center"
      />
      <div className="mx-auto mt-10 max-w-3xl">
        <FAQ items={faqItems} />
      </div>
    </section>
  );
}
