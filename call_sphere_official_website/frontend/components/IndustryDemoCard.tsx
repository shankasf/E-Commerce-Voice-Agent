"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Mic } from "lucide-react";

type ConversationEntry = {
  id: string;
  role: "agent" | "caller";
  stage: string;
  message: string;
  annotation?: string;
};

const industryScripts: { [key: string]: ConversationEntry[] } = {
  "HVAC Services": [
    {
      id: "hvac-agent-greeting",
      role: "agent",
      stage: "Greeting",
      annotation: "Inbound Call",
      message:
        "Hi, you've reached 'ComfortAir HVAC Services'. How can I help you today?",
    },
    {
      id: "hvac-caller-request",
      role: "caller",
      stage: "Issue",
      message: "My air conditioner stopped cooling.",
    },
    {
      id: "hvac-agent-confirm",
      role: "agent",
      stage: "Triage",
      annotation: "Diagnostics",
      message:
        "I can help with that. Is the unit running but not cooling, or is it completely off?",
    },
    {
      id: "hvac-caller-detail",
      role: "caller",
      stage: "Details",
      message: "It's running but blowing warm air.",
    },
    {
      id: "hvac-agent-wrap",
      role: "agent",
      stage: "Confirmation",
      annotation: "Dispatched",
      message:
        "Thanks. I've scheduled a technician to inspect your AC system. They'll arrive between 2-4 PM today. Is there anything else I can help with?",
    },
    {
      id: "hvac-caller-thanks",
      role: "caller",
      stage: "Wrap-up",
      message: "No, that's perfect.",
    },
  ],
  "Healthcare": [
    {
      id: "hc-agent-greeting",
      role: "agent",
      stage: "Greeting",
      annotation: "Inbound Call",
      message: "Hello, 'City Clinic'. How may I assist you?",
    },
    {
      id: "hc-caller-request",
      role: "caller",
      stage: "Request",
      message: "I need to schedule an appointment.",
    },
    {
      id: "hc-agent-question",
      role: "agent",
      stage: "Qualification",
      message: "I can help with that. Are you a new or existing patient?",
    },
    {
      id: "hc-caller-answer",
      role: "caller",
      stage: "Details",
      message: "Existing.",
    },
    {
      id: "hc-agent-dob",
      role: "agent",
      stage: "Verification",
      message: "What is your date of birth?",
    },
    {
      id: "hc-caller-dob",
      role: "caller",
      stage: "Details",
      message: "May 5th, 1985.",
    },
    {
      id: "hc-agent-offer",
      role: "agent",
      stage: "Scheduling",
      annotation: "Appointment Set",
      message:
        "Thank you. I see you're due for your annual check-up. Dr. Smith is available next Tuesday at 10am or Thursday at 2pm. Which do you prefer?",
    },
    {
      id: "hc-caller-choice",
      role: "caller",
      stage: "Confirmation",
      message: "Thursday at 2pm.",
    },
    {
      id: "hc-agent-wrap",
      role: "agent",
      stage: "Confirmation",
      message:
        "You're all set for Thursday at 2pm with Dr. Smith. You'll receive a confirmation text shortly. Can I help with anything else?",
    },
  ],
  "IT MSPs": [
    {
      id: "it-agent-greeting",
      role: "agent",
      stage: "Greeting",
      annotation: "Inbound Call",
      message: "You've reached the IT helpdesk. How can I help?",
    },
    {
      id: "it-caller-issue",
      role: "caller",
      stage: "Issue",
      message: "I can't log in to my email.",
    },
    {
      id: "it-agent-question",
      role: "agent",
      stage: "Triage",
      message: "I can help with that. Have you tried resetting your password through the portal?",
    },
    {
      id: "it-caller-answer",
      role: "caller",
      stage: "Details",
      message: "Yes, it didn't work.",
    },
    {
      id: "it-agent-ticket",
      role: "agent",
      stage: "Ticketing",
      annotation: "New Ticket",
      message: "Okay, I'm creating a priority ticket for you. An agent will be with you within the next 15 minutes to help you resolve this. What is your employee ID?",
    },
    {
      id: "it-caller-id",
      role: "caller",
      stage: "Details",
      message: "E45221.",
    },
    {
      id: "it-agent-wrap",
      role: "agent",
      stage: "Confirmation",
      message: "Thank you. Ticket #7856 has been created. Someone will call you shortly.",
    },
  ],
  "Logistics": [
    {
      id: "lo-agent-greeting",
      role: "agent",
      stage: "Greeting",
      annotation: "Inbound Call",
      message: "Hello, 'Speedy Logistics'. How can I help you today?",
    },
    {
      id: "lo-caller-request",
      role: "caller",
      stage: "Request",
      message: "Hi, I'm calling to check the status of my order.",
    },
    {
      id: "lo-agent-question",
      role: "agent",
      stage: "Details",
      message: "I can help with that. Do you have your tracking number?",
    },
    {
      id: "lo-caller-answer",
      role: "caller",
      stage: "Details",
      message: "Yes, it's 1Z9999W99999999999.",
    },
    {
      id: "lo-agent-status",
      role: "agent",
      stage: "Status",
      annotation: "Out for Delivery",
      message: "Thank you. I see your package is currently out for delivery and is expected to arrive by 5 PM today. Would you like to receive text message updates?",
    },
    {
      id: "lo-caller-confirm",
      role: "caller",
      stage: "Confirmation",
      message: "Yes, please.",
    },
    {
      id: "lo-agent-wrap",
      role: "agent",
      stage: "Confirmation",
      message: "You'll receive updates at the number you're calling from. Can I help with anything else?",
    },
  ]
};

const industryMeta: { [key: string]: { icon: string; phone?: string; isLiveVoice?: boolean; comingSoon?: boolean; color: string } } = {
  "HVAC Services": { icon: "🌡️", isLiveVoice: true, color: "bg-emerald-100 text-emerald-700" },
  "Healthcare": { icon: "⚕️", isLiveVoice: true, color: "bg-blue-100 text-blue-700" },
  "IT MSPs": { icon: "💻", isLiveVoice: true, color: "bg-amber-100 text-amber-700" },
  "Logistics": { icon: "🚚", comingSoon: true, color: "bg-purple-100 text-purple-700" },
};

const industries = Object.keys(industryScripts);

export function IndustryDemoCard() {
  const [industryIndex, setIndustryIndex] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const industryTimer = setInterval(() => {
      setIndustryIndex((prev) => (prev + 1) % industries.length);
      setStep(0);
    }, 12000);

    return () => clearInterval(industryTimer);
  }, []);

  const activeIndustry = industries[industryIndex];
  const conversationScript = industryScripts[activeIndustry];
  const meta = industryMeta[activeIndustry];

  useEffect(() => {
    const conversationTimer = setInterval(() => {
      setStep((prev) => (prev + 1) % conversationScript.length);
    }, 2000);

    return () => clearInterval(conversationTimer);
  }, [conversationScript]);

  const activeMessage = conversationScript[step];
  const progress =
    conversationScript.length > 1
      ? (step / (conversationScript.length - 1)) * 100
      : 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="relative flex justify-center"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        {/* Active indicator */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-gray-500">Live Demo</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${meta.color}`}>
            {meta.icon}
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-foreground">{activeIndustry}</p>
            {meta.isLiveVoice ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <Mic className="h-3.5 w-3.5" />
                <span className="font-medium">Tap to Talk</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
              </p>
            ) : meta.comingSoon ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                <Mic className="h-3.5 w-3.5" />
                <span className="font-medium">Coming Soon</span>
              </p>
            ) : (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {meta.phone}
              </p>
            )}
          </div>
        </div>

        {/* Conversation */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeMessage.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`mt-6 rounded-xl border p-4 ${activeMessage.role === "agent"
                ? "border-gray-200 bg-gray-50"
                : "border-gray-100 bg-white"
              }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {activeMessage.role === "agent" ? "CallSphere Agent" : "Customer"}
                </span>
                {activeMessage.annotation && (
                  <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                    {activeMessage.annotation}
                  </span>
                )}
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                {activeMessage.stage}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {activeMessage.message}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-800 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Industry tabs */}
        <div className="mt-6 flex gap-2">
          {industries.map((industry, idx) => (
            <button
              key={industry}
              onClick={() => {
                setIndustryIndex(idx);
                setStep(0);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition ${idx === industryIndex
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
                }`}
              title={industry}
            >
              {industryMeta[industry].icon}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">
            AI Agents For Every Industry
          </p>
          <span className="text-xs text-gray-400">
            Complex Workflows, Solved.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
