import { BrainCircuit, ClipboardCheck, ShoppingBasket } from "lucide-react";

import { SectionHeading } from "@/components/SectionHeading";

const steps = [
  {
    title: "Discover",
    description:
      "Voice or chat agent understands intent and queries the product catalog semantically.",
    icon: BrainCircuit,
  },
  {
    title: "Decide",
    description:
      "Applies filters (brand, size, price, availability) and builds the cart across any channel.",
    icon: ShoppingBasket,
  },
  {
    title: "Complete",
    description: "Checkout, payment handoff, confirmation via voice, chat, SMS, or email.",
    icon: ClipboardCheck,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-stack">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps to a completed order"
        description="From understanding intent to confirming delivery, voice and chat agents orchestrate the entire journey."
        align="center"
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="relative rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm"
          >
            <span
              className="absolute right-6 top-6 text-4xl font-bold text-gray-100"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
              <step.icon aria-hidden className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">
              {step.title}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
