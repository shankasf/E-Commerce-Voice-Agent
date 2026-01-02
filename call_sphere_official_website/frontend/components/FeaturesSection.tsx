"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Brain,
  Users,
  BarChart3,
  Globe,
} from "lucide-react";

import { SectionHeading } from "@/components/SectionHeading";

const features = [
  {
    title: "SOC2 & Privacy First",
    description: "No PII stored in platform or sent to base LLMs. Enterprise security standards.",
    icon: Shield,
  },
  {
    title: "Strong Guardrails",
    description: "Policy-driven guardrails prevent off-brand responses with full auditability.",
    icon: Zap,
  },
  {
    title: "Hallucination Free",
    description: "Every response anchored in your approved knowledge base and systems of record.",
    icon: Brain,
  },
  {
    title: "Multiple Personalities",
    description: "Configure different AI tones for each use case, product line, or region.",
    icon: Users,
  },
  {
    title: "Insights & Analytics",
    description: "Clear reporting on intents, resolutions, containment, and sentiment.",
    icon: BarChart3,
  },
  {
    title: "57+ Languages",
    description: "Support customers globally with natural conversations in their language.",
    icon: Globe,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-stack">
      <SectionHeading
        eyebrow="Platform"
        title="Platform your IT department will trust"
        description="Enterprise-ready conversational AI that fits into your existing stack without adding operational risk."
        align="center"
      />

      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

