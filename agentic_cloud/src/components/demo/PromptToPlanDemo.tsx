"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Check,
  DollarSign,
  Layers,
  ArrowRight,
  Globe,
  Cpu,
  Zap,
  HardDrive,
  Database,
  Shield,
  Activity,
  Rocket,
  Network,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { generatePlan, presetPrompts } from "@/lib/plan-generator";
import type { PlanResult, ServiceCategory } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const categoryIcons: Record<ServiceCategory, React.ReactNode> = {
  domains: <Globe className="w-4 h-4" />,
  compute: <Cpu className="w-4 h-4" />,
  serverless: <Zap className="w-4 h-4" />,
  storage: <HardDrive className="w-4 h-4" />,
  databases: <Database className="w-4 h-4" />,
  cache: <Layers className="w-4 h-4" />,
  queues: <GitBranch className="w-4 h-4" />,
  networking: <Network className="w-4 h-4" />,
  cdn: <Globe className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  observability: <Activity className="w-4 h-4" />,
  cicd: <Rocket className="w-4 h-4" />,
};

const categoryColors: Record<ServiceCategory, string> = {
  domains: "bg-blue-100 text-blue-700 border-blue-200",
  compute: "bg-purple-100 text-purple-700 border-purple-200",
  serverless: "bg-yellow-100 text-yellow-700 border-yellow-200",
  storage: "bg-green-100 text-green-700 border-green-200",
  databases: "bg-indigo-100 text-indigo-700 border-indigo-200",
  cache: "bg-red-100 text-red-700 border-red-200",
  queues: "bg-orange-100 text-orange-700 border-orange-200",
  networking: "bg-cyan-100 text-cyan-700 border-cyan-200",
  cdn: "bg-teal-100 text-teal-700 border-teal-200",
  security: "bg-rose-100 text-rose-700 border-rose-200",
  observability: "bg-violet-100 text-violet-700 border-violet-200",
  cicd: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const tierLabels = {
  starter: { label: "Starter", color: "bg-green-100 text-green-700" },
  growth: { label: "Growth", color: "bg-blue-100 text-blue-700" },
  scale: { label: "Scale", color: "bg-purple-100 text-purple-700" },
  enterprise: { label: "Enterprise", color: "bg-orange-100 text-orange-700" },
};

interface PromptToPlanDemoProps {
  className?: string;
  showPresets?: boolean;
  compact?: boolean;
}

export function PromptToPlanDemo({
  className,
  showPresets = true,
  compact = false,
}: PromptToPlanDemoProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [result, setResult] = React.useState<PlanResult | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResult(null);

    // Simulate API delay for effect
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const plan = generatePlan(prompt);
    setResult(plan);
    setIsGenerating(false);
  };

  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    setResult(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Input Section */}
      <div className="glass-card-strong rounded-2xl p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">
            Describe your infrastructure
          </span>
        </div>

        <Textarea
          placeholder="Example: Launch a scalable Next.js app with auth, Postgres, Redis cache, CDN, and observability..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] text-base mb-4 bg-white/80"
        />

        {showPresets && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Try a preset:</p>
            <div className="flex flex-wrap gap-2">
              {presetPrompts.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset.prompt)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Plan
            </>
          )}
        </Button>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mt-6 space-y-6"
          >
            {/* Architecture Modules */}
            <div className="glass-card-strong rounded-2xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recommended Architecture
                </h3>
                <Badge className={tierLabels[result.tier].color}>
                  {tierLabels[result.tier].label} Tier
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.modules.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-md",
                      categoryColors[module.category]
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {categoryIcons[module.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {module.name}
                        </p>
                        <p className="text-xs opacity-75 mt-0.5 line-clamp-2">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Estimate & Steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Estimate */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">
                    Estimated Monthly Cost
                  </h3>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    ${result.totalEstimate.min} – ${result.totalEstimate.max}
                    <span className="text-lg font-normal text-gray-500">
                      /mo
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Based on market benchmarks for similar configurations
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> These estimates are directional and
                    based on typical usage patterns. Final pricing depends on
                    actual resource consumption.
                  </p>
                </div>
              </motion.div>

              {/* Provisioning Steps */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card-strong rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-violet-600" />
                  <h3 className="font-semibold text-gray-900">
                    Provisioning Plan
                  </h3>
                </div>

                <ul className="space-y-2">
                  {result.steps.map((step, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{step}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <Link href="/waitlist">
                <Button size="xl" className="rounded-full">
                  Request Access
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <p className="text-sm text-gray-500 mt-3">
                Join the waitlist to be among the first to try Agentic Cloud
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
