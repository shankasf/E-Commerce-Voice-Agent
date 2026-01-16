"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Globe,
  Server,
  Mail,
  Database,
  Layers,
  Code2,
  Check,
  Loader2,
  DollarSign,
  Activity,
  Rocket,
  Shield,
  Zap,
  User,
  MessageSquare,
  Network,
  Container,
  GitBranch,
  BarChart3,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Journey steps - End-to-End SDLC for scalable apps
const journeySteps = [
  {
    id: "estimate",
    name: "Cost Estimation",
    icon: DollarSign,
    color: "from-emerald-500 to-teal-500",
    description: "Transparent TCO upfront"
  },
  {
    id: "domain",
    name: "Domain & SSL",
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
    description: "Register domain + SSL cert"
  },
  {
    id: "infrastructure",
    name: "Cloud Infrastructure",
    icon: Server,
    color: "from-violet-500 to-purple-500",
    description: "VPS + auto-scaling clusters"
  },
  {
    id: "database",
    name: "Database Setup",
    icon: Database,
    color: "from-green-500 to-emerald-500",
    description: "PostgreSQL + Redis cache"
  },
  {
    id: "app",
    name: "App Deployment",
    icon: Code2,
    color: "from-orange-500 to-amber-500",
    description: "Build & deploy Next.js app"
  },
  {
    id: "cicd",
    name: "CI/CD Pipeline",
    icon: GitBranch,
    color: "from-pink-500 to-rose-500",
    description: "GitHub Actions + auto-deploy"
  },
  {
    id: "observability",
    name: "Monitoring & Logs",
    icon: BarChart3,
    color: "from-indigo-500 to-blue-500",
    description: "CloudWatch + alerts"
  },
  {
    id: "security",
    name: "Security Hardening",
    icon: Shield,
    color: "from-red-500 to-orange-500",
    description: "WAF + DDoS + firewall"
  },
  {
    id: "production",
    name: "Go Live",
    icon: Rocket,
    color: "from-purple-500 to-pink-500",
    description: "Production deployment"
  },
];

// Services with pricing - End-to-End SDLC
const servicesPricing = [
  { id: "domain", name: "Domain + SSL", price: "$12/yr", icon: Globe },
  { id: "compute", name: "VPS (4GB/2vCPU)", price: "$29/mo", icon: Server },
  { id: "database", name: "PostgreSQL HA", price: "$25/mo", icon: Database },
  { id: "redis", name: "Redis Cache", price: "$15/mo", icon: Zap },
  { id: "app", name: "App Hosting", price: "Included", icon: Code2 },
  { id: "cicd", name: "CI/CD Pipeline", price: "Included", icon: GitBranch },
  { id: "monitoring", name: "CloudWatch Logs", price: "$19/mo", icon: BarChart3 },
  { id: "security", name: "WAF + Firewall", price: "$15/mo", icon: Shield },
];

type Phase = "prompt" | "analyzing" | "estimate" | "journey" | "complete";

const userPrompt = "I need to build a production-ready SaaS platform that can scale to millions of users with high availability, auto-scaling, and enterprise security.";

function CloudJourneyDemo() {
  const [phase, setPhase] = React.useState<Phase>("prompt");
  const [typedText, setTypedText] = React.useState("");
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<string[]>([]);

  // Typing animation for prompt
  React.useEffect(() => {
    if (phase === "prompt") {
      if (typedText.length < userPrompt.length) {
        const timer = setTimeout(() => {
          setTypedText(userPrompt.slice(0, typedText.length + 1));
        }, 35);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setPhase("analyzing");
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, typedText]);

  // Analyzing phase
  React.useEffect(() => {
    if (phase === "analyzing") {
      const timer = setTimeout(() => {
        setPhase("estimate");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Estimate to journey transition
  React.useEffect(() => {
    if (phase === "estimate") {
      const timer = setTimeout(() => {
        setPhase("journey");
        setCurrentStep(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Journey steps progression
  React.useEffect(() => {
    if (phase === "journey") {
      if (currentStep < journeySteps.length) {
        const timer = setTimeout(() => {
          setCompletedSteps(prev => [...prev, journeySteps[currentStep].id]);
          setCurrentStep(prev => prev + 1);
        }, 1200);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setPhase("complete");
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentStep]);

  // Auto restart
  React.useEffect(() => {
    if (phase === "complete") {
      const timer = setTimeout(() => {
        setPhase("prompt");
        setTypedText("");
        setCurrentStep(0);
        setCompletedSteps([]);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const totalMonthly = 103; // $29 + $25 + $15 + $19 + $15

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {/* Prompt Phase - Natural Language Input */}
        {phase === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900">Startup Founder</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">Describe your infrastructure needs...</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <span className="text-[10px] sm:text-xs text-green-600 font-medium">Live Demo</span>
              </div>
            </div>

            {/* Chat-style prompt input */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-3 sm:p-4 border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-h-[50px] sm:min-h-[60px]">
                  <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                    {typedText}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block w-0.5 h-3 sm:h-4 bg-violet-500 ml-0.5 align-middle"
                    />
                  </p>
                </div>
              </div>
            </div>

            {/* One Platform Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 text-center"
            >
              <Sparkles className="w-3 h-3 text-violet-500 flex-shrink-0" />
              <span className="hidden sm:inline">Enterprise-grade infrastructure • Zero DevOps complexity • Natural language</span>
              <span className="sm:hidden">Enterprise-grade • Zero complexity</span>
            </motion.div>
          </motion.div>
        )}

        {/* Analyzing Phase */}
        {phase === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl border border-violet-200/50"
          >
            <div className="text-center py-6 sm:py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center"
              >
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Architecting Your Infrastructure
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-4">
                AI is designing production-grade architecture for scale...
              </p>
              <div className="flex items-center justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Estimate Phase - Price Upfront */}
        {phase === "estimate" && (
          <motion.div
            key="estimate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl border border-emerald-200/50"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">Estimated Price</span>
                <p className="text-[10px] sm:text-xs text-gray-500">Transparent pricing, no surprises</p>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
              >
                Best Value
              </motion.div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {servicesPricing.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white/80 rounded-lg p-2 sm:p-3 border border-gray-100"
                >
                  <service.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600 mb-1 sm:mb-1.5" />
                  <p className="text-[9px] sm:text-[11px] font-medium text-gray-700 mb-0.5 leading-tight line-clamp-2">{service.name}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600">{service.price}</p>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
            >
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5">Total Estimated Cost</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-violet-600">${totalMonthly}</span>
                  <span className="text-xs sm:text-sm text-gray-500">/month</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">+ $12/year domain registration</p>
              </div>
              <div className="flex items-center gap-2 text-violet-600 self-end sm:self-auto">
                <span className="text-[10px] sm:text-xs font-medium">Deploying</span>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Journey Phase - Step by Step Deployment */}
        {phase === "journey" && (
          <motion.div
            key="journey"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-5">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-gray-900">Building Your Infrastructure</span>
              <span className="ml-auto text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                {completedSteps.length}/{journeySteps.length} complete
              </span>
            </div>

            {/* Journey Timeline - Scrollable on mobile */}
            <div className="space-y-2 sm:space-y-3 max-h-[320px] sm:max-h-none overflow-y-auto pr-1">
              {journeySteps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isActive = currentStep === index && !isCompleted;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${
                      isCompleted
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                        : isActive
                          ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200"
                          : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : isActive
                          ? `bg-gradient-to-r ${step.color}`
                          : "bg-gray-200"
                    }`}>
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </motion.div>
                      ) : (
                        <step.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-medium truncate ${
                        isCompleted ? "text-green-700" : isActive ? "text-violet-700" : "text-gray-500"
                      }`}>
                        {step.name}
                      </p>
                      <p className={`text-[10px] sm:text-xs truncate ${
                        isCompleted ? "text-green-600" : isActive ? "text-violet-600" : "text-gray-400"
                      }`}>
                        {isCompleted ? "Completed" : isActive ? "In progress..." : step.description}
                      </p>
                    </div>

                    {/* Status */}
                    {isActive && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0"
                      >
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-500" />
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-400" />
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-300" />
                      </motion.div>
                    )}

                    {/* Connector line - hidden on mobile for cleaner look */}
                    {index < journeySteps.length - 1 && (
                      <div className={`hidden sm:block absolute left-8 top-[52px] w-0.5 h-3 ${
                        isCompleted ? "bg-green-300" : "bg-gray-200"
                      }`} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-2xl p-4 sm:p-6 shadow-xl border border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
          >
            <div className="text-center py-2 sm:py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-green-500/30"
              >
                <Check className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
              </motion.div>

              <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                Production-Ready Infrastructure Live!
              </h3>

              {/* Live Domain URL */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3 sm:mb-4"
              >
                <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                  <span className="text-xs sm:text-sm font-mono">https://myapp.callsphere.cloud</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5">Your app is now live in production</p>
              </motion.div>

              {/* Deployed Services - Grid on mobile, flex on larger screens */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1">
                {journeySteps.slice(1).map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 + 0.4 }}
                    className="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 bg-white rounded-full px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm border border-gray-100"
                  >
                    <step.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-gray-700 truncate">{step.name}</span>
                  </motion.div>
                ))}
              </div>

              {/* Key benefits - Stack on mobile */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500"
              >
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Auto-scaling
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" />
                  <span className="hidden sm:inline">Enterprise </span>Security
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-green-500" />
                  99.99% SLA
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Full stack • One platform • </span>
                <span className="sm:hidden">One platform • </span>
                From ${totalMonthly}/mo
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Agent cursor effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/4 w-4 h-6 bg-violet-500/20 rounded-sm"
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, 200, 200, 400],
            y: [0, 50, 50, 100],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container-custom relative">
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="gradient"
              className="px-4 py-1.5 text-sm font-medium mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Now in Private Beta
            </Badge>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-gray-900 mb-6"
          >
            <span className="block">Complete Cloud</span>
            <span className="relative">
              <span className="gradient-text">Infrastructure</span>
              <motion.span
                className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20 blur-2xl"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </span>
            <span className="block">Under One Roof</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-2xl mx-auto mb-8"
          >
            Domain, VPS, Kubernetes, Databases, Email — all managed by AI.
            <br className="hidden sm:block" />
            Just describe your needs, we deploy everything.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/waitlist">
              <Button size="xl" className="rounded-full w-full sm:w-auto">
                Join Waitlist
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="xl"
                variant="outline"
                className="rounded-full w-full sm:w-auto"
              >
                View Pricing
              </Button>
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 text-sm text-gray-500"
          >
            Trusted by businesses deploying infrastructure faster than ever
          </motion.p>
        </div>

        {/* Cloud Journey Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <CloudJourneyDemo />
        </motion.div>
      </div>
    </section>
  );
}
