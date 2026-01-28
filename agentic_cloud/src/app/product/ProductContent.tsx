"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Layers,
  Shield,
  Zap,
  GitBranch,
  BarChart2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptToPlanDemo } from "@/components/demo/PromptToPlanDemo";
import { presetPrompts } from "@/lib/plan-generator";

const capabilities = [
  {
    icon: Brain,
    title: "Natural Language Understanding",
    description:
      "Our AI understands infrastructure requirements described in plain English, technical jargon, or anything in between.",
  },
  {
    icon: Layers,
    title: "Intelligent Architecture",
    description:
      "Automatically selects the right combination of services based on your needs, following cloud best practices.",
  },
  {
    icon: Shield,
    title: "Security by Default",
    description:
      "Every deployment includes encryption, access controls, and security configurations without extra effort.",
  },
  {
    icon: Zap,
    title: "Instant Deployment",
    description:
      "Go from prompt to production in minutes. No manual configuration, no infrastructure expertise required.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description:
      "All infrastructure is code. Track changes, review deployments, and rollback with Git workflows.",
  },
  {
    icon: BarChart2,
    title: "Cost Optimization",
    description:
      "Get accurate cost estimates upfront and recommendations to optimize spending as you scale.",
  },
];

const examplePrompts = [
  {
    prompt:
      "Deploy a Next.js app with user authentication, PostgreSQL database, and Redis for session storage",
    result: [
      "Container runtime for Next.js",
      "Managed PostgreSQL (HA)",
      "Redis cluster",
      "IAM integration",
      "SSL certificates",
      "Logging & monitoring",
    ],
  },
  {
    prompt:
      "Create a data pipeline that ingests events from Kafka, processes with Spark, and stores in data warehouse",
    result: [
      "Kafka cluster",
      "Spark processing nodes",
      "Data warehouse",
      "Workflow orchestration",
      "Schema registry",
      "Monitoring dashboards",
    ],
  },
  {
    prompt:
      "Set up a microservices architecture with service mesh, API gateway, and distributed tracing",
    result: [
      "Kubernetes cluster",
      "Service mesh (Istio)",
      "API Gateway",
      "Distributed tracing",
      "Log aggregation",
      "Metrics & alerting",
    ],
  },
];

export function ProductContent() {
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
                How It Works
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Cloud Infrastructure
              <br />
              <span className="gradient-text">Through Conversation</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Describe what you want to build. Our AI analyzes your requirements
              and provisions the perfect infrastructure — optimized, secure, and
              ready to scale.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Powered by AI, Built for Developers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              Our agentic AI combines deep cloud expertise with natural language
              understanding.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilities.map((cap, index) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-strong rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                  <cap.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {cap.title}
                </h3>
                <p className="text-gray-600">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Prompts */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Example Architectures
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              See how natural language prompts translate to cloud architecture
            </motion.p>
          </div>

          <div className="space-y-8">
            {examplePrompts.map((example, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-strong rounded-2xl p-6 lg:p-8"
              >
                <div className="lg:flex lg:gap-8">
                  <div className="lg:w-1/2 mb-6 lg:mb-0">
                    <p className="text-sm text-violet-600 font-medium mb-2">
                      Prompt
                    </p>
                    <p className="text-lg text-gray-900 font-medium leading-relaxed">
                      "{example.prompt}"
                    </p>
                  </div>
                  <div className="lg:w-1/2">
                    <p className="text-sm text-green-600 font-medium mb-3">
                      Generated Architecture
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {example.result.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Try It Yourself
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              Enter your own infrastructure requirements and see the generated
              plan
            </motion.p>
          </div>

          <div className="max-w-4xl mx-auto">
            <PromptToPlanDemo />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
            >
              Ready to Transform Your Infrastructure?
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/waitlist">
                <Button size="xl" className="rounded-full">
                  Join Waitlist
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
