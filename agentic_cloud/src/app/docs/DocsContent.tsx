"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Code2,
  Terminal,
  Boxes,
  Rocket,
  FileCode,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const docsSections = [
  {
    id: "quickstart",
    icon: Rocket,
    title: "Quickstart",
    description: "Get up and running in 5 minutes",
    color: "from-green-500 to-emerald-600",
    items: [
      { title: "Installation", content: "npm install -g @callsphere/agentic-cli" },
      { title: "Authentication", content: "agentic login" },
      { title: "First Deployment", content: 'agentic deploy "Your prompt here"' },
    ],
  },
  {
    id: "api",
    icon: Code2,
    title: "API Reference",
    description: "Complete REST API documentation",
    color: "from-blue-500 to-indigo-600",
    items: [
      { title: "Authentication", content: "Bearer token authentication" },
      { title: "Endpoints", content: "/v1/plans, /v1/deployments, /v1/services" },
      { title: "SDKs", content: "TypeScript, Python, Go" },
    ],
  },
  {
    id: "cli",
    icon: Terminal,
    title: "CLI Reference",
    description: "Command-line interface documentation",
    color: "from-violet-500 to-purple-600",
    items: [
      { title: "deploy", content: "Create deployments from prompts" },
      { title: "status", content: "Check deployment status" },
      { title: "logs", content: "Stream application logs" },
    ],
  },
  {
    id: "examples",
    icon: FileCode,
    title: "Examples",
    description: "Ready-to-use templates and recipes",
    color: "from-pink-500 to-rose-600",
    items: [
      { title: "Next.js + Postgres", content: "Full-stack web application" },
      { title: "API + Redis", content: "Cached backend service" },
      { title: "Microservices", content: "Multi-service architecture" },
    ],
  },
];

const cliCommands = [
  { command: "agentic login", description: "Authenticate with your account" },
  { command: "agentic deploy <prompt>", description: "Deploy from a natural language prompt" },
  { command: "agentic deploy --config agentic.yaml", description: "Deploy from configuration file" },
  { command: "agentic status", description: "Show status of all deployments" },
  { command: "agentic logs <deployment>", description: "Stream logs from a deployment" },
  { command: "agentic scale <deployment> --min 2 --max 10", description: "Configure auto-scaling" },
  { command: "agentic destroy <deployment>", description: "Tear down a deployment" },
  { command: "agentic plan <prompt>", description: "Preview architecture without deploying" },
];

const apiEndpoints = [
  { method: "POST", path: "/v1/plans", description: "Generate an architecture plan from a prompt" },
  { method: "GET", path: "/v1/plans/:id", description: "Get plan details" },
  { method: "POST", path: "/v1/deployments", description: "Create a new deployment from a plan" },
  { method: "GET", path: "/v1/deployments", description: "List all deployments" },
  { method: "GET", path: "/v1/deployments/:id", description: "Get deployment details" },
  { method: "DELETE", path: "/v1/deployments/:id", description: "Delete a deployment" },
  { method: "GET", path: "/v1/services", description: "List available services" },
  { method: "GET", path: "/v1/estimates", description: "Get cost estimates for a plan" },
];

export function DocsContent() {
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
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Documentation
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Learn to Build with
              <br />
              <span className="gradient-text">Agentic Cloud</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-8"
            >
              Everything you need to get started: guides, API reference, CLI
              documentation, and examples.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a href="#quickstart">
                <Button size="lg" className="rounded-full">
                  <Rocket className="w-4 h-4 mr-2" />
                  Quickstart
                </Button>
              </a>
              <a href="#api">
                <Button size="lg" variant="outline" className="rounded-full">
                  <Code2 className="w-4 h-4 mr-2" />
                  API Reference
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Nav Cards */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {docsSections.map((section, index) => (
              <motion.a
                key={section.id}
                href={`#${section.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group glass-card-strong rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4`}
                >
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                  {section.title}
                </h3>
                <p className="text-gray-600 text-sm">{section.description}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="py-16 lg:py-24 scroll-mt-24">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Quickstart</h2>
            </div>

            <div className="bg-gray-900 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-sm text-gray-400">Terminal</span>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="text-gray-300">
{`# Step 1: Install the CLI
npm install -g @callsphere/agentic-cli

# Step 2: Authenticate
agentic login

# Step 3: Deploy your first app
agentic deploy "A Next.js app with PostgreSQL and Redis"

# That's it! Your infrastructure is now live.
# Check status with:
agentic status`}
                </code>
              </pre>
            </div>

            <div className="mt-8 p-6 bg-violet-50 rounded-xl border border-violet-200">
              <p className="text-violet-800 text-sm">
                <strong>Note:</strong> The CLI and API are currently in private
                beta. Join the waitlist to get early access.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CLI Reference */}
      <section id="cli" className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white scroll-mt-24">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">CLI Reference</h2>
            </div>

            <div className="space-y-4">
              {cliCommands.map((cmd, index) => (
                <motion.div
                  key={cmd.command}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <code className="font-mono text-sm bg-gray-900 text-violet-400 px-3 py-1.5 rounded-lg">
                    {cmd.command}
                  </code>
                  <span className="text-gray-600 text-sm sm:ml-auto">
                    {cmd.description}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* API Reference */}
      <section id="api" className="py-16 lg:py-24 scroll-mt-24">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">API Reference</h2>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Base URL
              </h3>
              <code className="font-mono text-sm bg-gray-100 px-4 py-2 rounded-lg block">
                https://api.callsphere.tech/v1
              </code>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Authentication
              </h3>
              <p className="text-gray-600 mb-4">
                All API requests require a Bearer token in the Authorization
                header:
              </p>
              <code className="font-mono text-sm bg-gray-900 text-gray-300 px-4 py-3 rounded-lg block">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Endpoints
              </h3>
              <div className="space-y-3">
                {apiEndpoints.map((endpoint, index) => (
                  <motion.div
                    key={endpoint.path}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          endpoint.method === "GET"
                            ? "bg-green-100 text-green-700"
                            : endpoint.method === "POST"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-gray-900">
                        {endpoint.path}
                      </code>
                    </div>
                    <span className="text-gray-600 text-sm sm:ml-auto">
                      {endpoint.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white scroll-mt-24">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Examples</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Next.js + PostgreSQL",
                  description: "Full-stack web application with database",
                  prompt: "Deploy a Next.js app with PostgreSQL, auth, and Redis cache",
                },
                {
                  title: "Express API",
                  description: "REST API with caching and monitoring",
                  prompt: "Node.js API with Redis, logging, and auto-scaling",
                },
                {
                  title: "Static Website",
                  description: "Static site with CDN and custom domain",
                  prompt: "Static site with global CDN, custom domain, and analytics",
                },
                {
                  title: "Microservices",
                  description: "Multi-service architecture with service mesh",
                  prompt: "Kubernetes cluster with service mesh and distributed tracing",
                },
              ].map((example, index) => (
                <motion.div
                  key={example.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card-strong rounded-xl p-6"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {example.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {example.description}
                  </p>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <code className="text-xs text-violet-400 font-mono">
                      agentic deploy "{example.prompt}"
                    </code>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
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
              Ready to Get Started?
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/waitlist">
                <Button size="xl" className="rounded-full">
                  Join Waitlist for Access
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
