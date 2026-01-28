"use client";

import { motion } from "framer-motion";
import { Terminal, Code2, Boxes, FileCode } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const cliExample = `# Install the CLI
npm install -g @callsphere/agentic-cli

# Login to your account
agentic login

# Deploy from a prompt
agentic deploy "Next.js app with Postgres and Redis"

# Or use a config file
agentic deploy --config agentic.yaml`;

const apiExample = `import { AgenticCloud } from '@callsphere/agentic-sdk';

const cloud = new AgenticCloud({
  apiKey: process.env.AGENTIC_API_KEY
});

// Create infrastructure from a prompt
const plan = await cloud.plan({
  prompt: "Next.js app with auth, Postgres, and Redis"
});

// Review and deploy
const deployment = await plan.deploy();
console.log(deployment.url);`;

const terraformExample = `# agentic.tf
module "my_app" {
  source = "callsphere/agentic-stack"

  prompt = "Scalable API with PostgreSQL"

  # Override specific settings
  compute = {
    min_instances = 2
    max_instances = 10
  }

  database = {
    size = "large"
    high_availability = true
  }
}`;

const yamlExample = `# agentic.yaml
name: my-application
prompt: |
  Next.js frontend with Node.js API, PostgreSQL,
  Redis cache, and CDN for static assets.

settings:
  region: us-east-1
  environment: production

overrides:
  database:
    size: medium
    backups: daily

  observability:
    logs: enabled
    metrics: enabled
    tracing: enabled`;

export function DeveloperExperienceSection() {
  return (
    <section className="py-20 lg:py-32 bg-gray-900 text-white">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold mb-6"
            >
              Built for Developers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-400 mb-8"
            >
              Use the tools you love. CLI, API, SDKs, or Infrastructure as Code
              — Agentic Cloud fits into your existing workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Terminal className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">CLI</h4>
                  <p className="text-sm text-gray-400">
                    Deploy from your terminal
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">API & SDKs</h4>
                  <p className="text-sm text-gray-400">
                    TypeScript, Python, Go
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Boxes className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Terraform</h4>
                  <p className="text-sm text-gray-400">
                    Official provider
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <FileCode className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">YAML Config</h4>
                  <p className="text-sm text-gray-400">
                    Declarative deploys
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Code Examples */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Tabs defaultValue="cli" className="w-full">
              <TabsList className="bg-gray-800 border border-gray-700 p-1 mb-4">
                <TabsTrigger
                  value="cli"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  CLI
                </TabsTrigger>
                <TabsTrigger
                  value="sdk"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  SDK
                </TabsTrigger>
                <TabsTrigger
                  value="terraform"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  Terraform
                </TabsTrigger>
                <TabsTrigger
                  value="yaml"
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                >
                  YAML
                </TabsTrigger>
              </TabsList>

              <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>

                <TabsContent value="cli" className="m-0">
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{cliExample}</code>
                  </pre>
                </TabsContent>

                <TabsContent value="sdk" className="m-0">
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{apiExample}</code>
                  </pre>
                </TabsContent>

                <TabsContent value="terraform" className="m-0">
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{terraformExample}</code>
                  </pre>
                </TabsContent>

                <TabsContent value="yaml" className="m-0">
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{yamlExample}</code>
                  </pre>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
