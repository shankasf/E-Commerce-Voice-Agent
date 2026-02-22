"use client";

import { useState, useEffect } from "react";
import { Thermometer, Stethoscope, Monitor, Truck, Mic, PhoneOff } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import type { SectorType, MultiAgentStatusDetail } from "@/components/MultiAgentVoiceLauncher";

const industries = [
  {
    name: "HVAC Services",
    icon: Thermometer,
    sector: "hvac" as SectorType,
    description: "Streamline service requests, schedule maintenance, and dispatch technicians for heating, ventilation, and air conditioning systems around the clock.",
    features: ["Service Scheduling", "Emergency Dispatch", "System Diagnostics"],
    stat: "95%",
    statLabel: "calls resolved",
  },
  {
    name: "Healthcare & Dental",
    icon: Stethoscope,
    sector: "healthcare" as SectorType,
    description: "Manage appointments, verify insurance, and reduce no-shows with proactive reminders. Every patient call answered.",
    features: ["Appointment Scheduling", "Insurance Verification", "No-Show Reduction"],
    stat: "40%",
    statLabel: "fewer no-shows",
  },
  {
    name: "IT Support",
    icon: Monitor,
    sector: "it_support" as SectorType,
    description: "Deflect Tier-1 tickets, auto-create categorized tickets, and provide instant status updates without human intervention.",
    features: ["Ticket Triage & Creation", "Smart Escalation", "Status Updates"],
    stat: "60%",
    statLabel: "faster resolution",
  },
  {
    name: "Logistics & Delivery",
    icon: Truck,
    sector: "logistics" as SectorType,
    description: "Real-time order status, exception handling, and rescheduling. Handle urgent inquiries with accurate, instant responses.",
    features: ["Order Tracking", "Exception Handling", "Redelivery Scheduling"],
    stat: "24/7",
    statLabel: "availability",
  },
];

type CallState = "idle" | "connecting" | "connected";

export function IndustriesSection() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Listen for status updates from MultiAgentVoiceLauncher
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<MultiAgentStatusDetail>).detail;

      if (detail.isConnecting) {
        setCallState("connecting");
        setActiveIndustry(detail.sectorName);
      } else if (detail.isConnected) {
        setCallState("connected");
        setActiveIndustry(detail.sectorName);
        setDuration(detail.duration);
      } else {
        setCallState("idle");
        setActiveIndustry(null);
        setDuration(0);
      }
    };

    window.addEventListener("multi-agent-status", handleStatus as EventListener);
    return () => window.removeEventListener("multi-agent-status", handleStatus as EventListener);
  }, []);

  const handleVoiceClick = (sector: SectorType, industryName: string) => {
    if (typeof window === "undefined") return;

    // If clicking on the active industry while connected/connecting, stop
    if (activeIndustry === industryName && callState !== "idle") {
      window.dispatchEvent(
        new CustomEvent("multi-agent-command", {
          detail: { action: "stop" },
        })
      );
      return;
    }

    // Start new session
    window.dispatchEvent(
      new CustomEvent("multi-agent-command", {
        detail: {
          action: "start",
          sector,
          sectorName: industryName,
        },
      })
    );
  };

  const getCallStateForIndustry = (industryName: string) => {
    if (activeIndustry !== industryName) return "idle";
    return callState;
  };

  return (
    <section id="industries" className="section-stack">
      <SectionHeading
        eyebrow="Industries"
        title="Built for the unique needs of large B2C enterprises"
        description="Use AI to modernize customer support at scale while staying aligned with your proprietary products, brand voice, processes, and compliance requirements."
        align="center"
      />

      {/* Industry Grid */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <div
              key={industry.name}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {industry.name}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {industry.description}
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{industry.stat}</span>
                <span className="text-sm text-slate-500">{industry.statLabel}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {industry.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Banner */}
      <div className="mt-20 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-700">AI Agents Online</span>
          </div>
          <h3 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Talk to Our AI Voice Agent
          </h3>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Click below to speak with our AI instantly. No signup required.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {industries.map((industry) => {
            const industryCallState = getCallStateForIndustry(industry.name);

            const cardBase = "flex h-[180px] flex-col items-center rounded-2xl border p-5 text-center shadow-sm";
            const iconBase = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white";
            const titleBase = "mt-3 line-clamp-2 h-10 w-full text-sm font-semibold leading-5 text-slate-900";
            const actionBase = "mt-auto flex h-6 items-center justify-center text-sm font-bold";

            return (
              <button
                key={industry.name}
                onClick={() => handleVoiceClick(industry.sector, industry.name)}
                className={`${cardBase} transition-all ${
                  industryCallState === "connected"
                    ? "border-red-300 bg-gradient-to-b from-red-50 to-white hover:border-red-400"
                    : industryCallState === "connecting"
                    ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white"
                    : "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white hover:border-emerald-400 hover:shadow-md"
                }`}
              >
                <div
                  className={`${iconBase} ${
                    industryCallState === "connected"
                      ? "animate-pulse bg-red-500"
                      : industryCallState === "connecting"
                      ? "bg-amber-500"
                      : "bg-emerald-600"
                  }`}
                >
                  {industryCallState === "connected" ? (
                    <PhoneOff className="h-5 w-5" />
                  ) : industryCallState === "connecting" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </div>
                <p className={titleBase}>{industry.name}</p>
                <p
                  className={`${actionBase} gap-1.5 ${
                    industryCallState === "connected"
                      ? "text-red-600"
                      : industryCallState === "connecting"
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {industryCallState === "connected" ? (
                    <>
                      <span className="font-mono">{formatDuration(duration)}</span>
                      <span className="text-xs font-normal">- Tap to end</span>
                    </>
                  ) : industryCallState === "connecting" ? (
                    "Connecting..."
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      </span>
                      Tap to Talk
                    </>
                  )}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Available 24/7 · 57+ Languages Supported
        </p>
      </div>
    </section>
  );
}
