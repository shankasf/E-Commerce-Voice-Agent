"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Layers,
  BarChart2,
  GitBranch,
  RefreshCw,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Setup",
    description:
      "Describe your infrastructure in plain English. Get a production-ready setup in minutes, not days.",
    color: "from-yellow-400 to-orange-500",
  },
  {
    icon: Layers,
    title: "Best-Practice Architecture",
    description:
      "Every provisioned resource follows battle-tested patterns. No more guessing about configurations.",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: Shield,
    title: "Built-in Guardrails",
    description:
      "Security defaults, cost limits, and compliance checks are applied automatically.",
    color: "from-green-400 to-emerald-500",
  },
  {
    icon: BarChart2,
    title: "Full Observability",
    description:
      "Logs, metrics, and traces are configured from day one. Know what's happening everywhere.",
    color: "from-purple-400 to-violet-500",
  },
  {
    icon: RefreshCw,
    title: "Auto-Scaling",
    description:
      "Start small and scale automatically based on demand. Pay only for what you use.",
    color: "from-pink-400 to-rose-500",
  },
  {
    icon: GitBranch,
    title: "GitOps Ready",
    description:
      "Your infrastructure is code. Version it, review it, and deploy it through Git workflows.",
    color: "from-cyan-400 to-teal-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            Why Agentic-Cloud?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            Cloud infrastructure shouldn't require a PhD. We combine AI with
            cloud expertise to give you superpowers.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="glass-card-strong rounded-2xl p-6 lg:p-8 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
