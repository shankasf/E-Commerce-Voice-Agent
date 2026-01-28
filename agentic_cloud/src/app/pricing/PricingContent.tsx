"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Check,
  HelpCircle,
  Zap,
  Building2,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptToPlanDemo } from "@/components/demo/PromptToPlanDemo";

const pricingPrinciples = [
  {
    title: "Pay As You Go",
    description:
      "No upfront commitments. Pay only for the resources you actually use, billed by the second.",
  },
  {
    title: "Transparent Pricing",
    description:
      "Clear pricing for every service. No hidden fees, no surprise charges at the end of the month.",
  },
  {
    title: "Cost Optimization",
    description:
      "Built-in recommendations to reduce costs. Auto-scaling ensures you never overpay for idle resources.",
  },
  {
    title: "Predictable Bills",
    description:
      "Set spending limits and alerts. Know exactly what you'll pay before you deploy.",
  },
];

const tiers = [
  {
    name: "Starter",
    description: "For side projects and MVPs",
    priceRange: "$0 - $100/mo",
    features: [
      "All core services",
      "Shared infrastructure",
      "Community support",
      "Basic observability",
      "Standard SLA",
    ],
    cta: "Join Waitlist",
    highlighted: false,
  },
  {
    name: "Growth",
    description: "For growing teams and products",
    priceRange: "$100 - $1,000/mo",
    features: [
      "Everything in Starter",
      "Dedicated resources",
      "Priority support",
      "Advanced observability",
      "99.9% SLA",
      "Team collaboration",
    ],
    cta: "Join Waitlist",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    priceRange: "Custom",
    features: [
      "Everything in Growth",
      "Private infrastructure",
      "24/7 support",
      "Custom SLAs",
      "SSO & SAML",
      "Compliance (SOC 2, HIPAA)",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingContent() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge variant="gradient" className="mb-6">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Pricing
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Simple, Transparent
              <br />
              <span className="gradient-text">Cloud Pricing</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Pay only for what you use. No hidden fees, no complex
              calculations. Pricing details coming soon during our beta launch.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Pricing Principles */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Our Pricing Philosophy
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPrinciples.map((principle, index) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-strong rounded-2xl p-6 text-center"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {principle.title}
                </h3>
                <p className="text-gray-600 text-sm">{principle.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Plans for Every Stage
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              From side projects to enterprise deployments
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl p-8 ${
                  tier.highlighted
                    ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl scale-105"
                    : "glass-card-strong"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {tier.name === "Starter" && (
                    <Zap className="w-5 h-5 text-yellow-400" />
                  )}
                  {tier.name === "Growth" && (
                    <Rocket className="w-5 h-5 text-pink-300" />
                  )}
                  {tier.name === "Enterprise" && (
                    <Building2
                      className={`w-5 h-5 ${
                        tier.highlighted ? "text-white" : "text-violet-600"
                      }`}
                    />
                  )}
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                </div>

                <p
                  className={`text-sm mb-4 ${
                    tier.highlighted ? "text-violet-200" : "text-gray-600"
                  }`}
                >
                  {tier.description}
                </p>

                <div className="mb-6">
                  <span className="text-3xl font-bold">{tier.priceRange}</span>
                  {tier.priceRange !== "Custom" && (
                    <span
                      className={`text-sm ${
                        tier.highlighted ? "text-violet-200" : "text-gray-500"
                      }`}
                    >
                      {" "}
                      typical range
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          tier.highlighted ? "text-green-300" : "text-green-500"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.cta === "Contact Sales" ? "/company#contact" : "/waitlist"}
                >
                  <Button
                    className={`w-full rounded-full ${
                      tier.highlighted
                        ? "bg-white text-violet-700 hover:bg-gray-100"
                        : ""
                    }`}
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-gray-500 mt-8 max-w-2xl mx-auto"
          >
            <HelpCircle className="w-4 h-4 inline mr-1" />
            Final pricing will be announced during our public launch. Join the
            waitlist to be notified and receive early-access pricing.
          </motion.p>
        </div>
      </section>

      {/* Cost Estimator */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Estimate Your Costs
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              Describe your infrastructure and get a rough cost estimate based
              on market benchmarks.
            </motion.p>
          </div>

          <div className="max-w-4xl mx-auto">
            <PromptToPlanDemo showPresets={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
