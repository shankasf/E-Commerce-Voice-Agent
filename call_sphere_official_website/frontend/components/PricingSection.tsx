"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { PricingCard } from "@/components/PricingCard";
import { SectionHeading } from "@/components/SectionHeading";

const MONTHLY_PLANS = [
  {
    name: "Starter",
    price: 149,
    description: "Up to 2k interactions, 1 number + chat widget",
    benefits: ["Voice + Chat agents", "Order & support flows", "Email summaries", "Basic analytics"],
  },
  {
    name: "Growth",
    price: 499,
    description: "10k interactions, 3 numbers + chat channels",
    benefits: [
      "Voice + Chat + SMS agents",
      "Advanced analytics",
      "CRM + helpdesk integration",
      "Live monitoring",
      "Customer data vaulting",
    ],
    highlighted: true,
  },
  {
    name: "Scale",
    price: 1499,
    description: "50k interactions, 10 numbers + unlimited chat",
    benefits: [
      "All channels: Voice, Chat, SMS, WhatsApp",
      "Dedicated CSM",
      "SSO & role-based access",
      "Priority routing & queueing",
      "Custom reporting",
    ],
  },
];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly"
  );

  const plans = useMemo(() => {
    if (billingCycle === "monthly") {
      return MONTHLY_PLANS.map((plan) => ({
        ...plan,
        displayPrice: `$${plan.price}`,
        billingLabel: "/mo",
      }));
    }

    return MONTHLY_PLANS.map((plan) => {
      const annualPrice = Math.round(plan.price * 12 * 0.85);
      return {
        ...plan,
        displayPrice: `$${annualPrice}`,
        billingLabel: "/yr",
        description: `${plan.description} · Billed annually`,
      };
    });
  }, [billingCycle]);

  return (
    <section
      id="pricing"
      className="section-stack"
      aria-labelledby="pricing-title"
    >
      <SectionHeading
        eyebrow="Pricing"
        title="Voice & Chat plans that scale"
        description="Switch to annual billing and save 15%. Every plan includes voice agents, chat agents, PCI-compliant payments, and real-time analytics."
        align="center"
      />
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 text-sm shadow-sm">
          <Button
            variant={billingCycle === "monthly" ? "default" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === "annual" ? "default" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setBillingCycle("annual")}
          >
            Annual -15%
          </Button>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            price={plan.displayPrice}
            description={plan.description}
            benefits={plan.benefits}
            highlighted={plan.highlighted}
            billingLabel={plan.billingLabel}
            onSelect={() => {
              const element = document.querySelector("#contact");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ))}
      </div>
    </section>
  );
}
