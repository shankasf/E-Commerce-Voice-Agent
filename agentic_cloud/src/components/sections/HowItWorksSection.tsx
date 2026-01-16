"use client";

import { motion } from "framer-motion";
import { MessageSquare, Cpu, Rocket } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: MessageSquare,
    title: "Describe Your Needs",
    description:
      "Write a natural language prompt describing the infrastructure you need. Be as specific or as general as you want.",
    color: "from-violet-500 to-purple-600",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Generates Your Architecture",
    description:
      "Our AI analyzes your requirements, selects the right services, and creates an optimized architecture plan.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Deploy in One Click",
    description:
      "Review the plan, adjust if needed, and deploy. Your infrastructure is live in minutes with full observability.",
    color: "from-pink-500 to-rose-600",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            From prompt to production in three simple steps
          </motion.p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-200 via-indigo-200 to-pink-200 -translate-y-1/2" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="glass-card-strong rounded-2xl p-8 text-center relative z-10">
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200 text-sm font-bold text-gray-400 mb-6">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
