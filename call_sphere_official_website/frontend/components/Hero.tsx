"use client";

import * as React from "react";
import { ArrowRight, Phone, MessageSquare, Lock, Shield, CheckCircle2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/Button";

// Live Chat Demo Component - Property Rental Deal
function LiveChatDemo() {
  const [messageIndex, setMessageIndex] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messages = [
    { from: "system", text: "🔐 Secure connection established • End-to-end encrypted" },
    { from: "user", text: "Hi, I'm interested in the 2BR apartment on Oak Street" },
    { from: "agent", text: "Hello! I'd be happy to help. Let me verify your identity first. What's your registered email?" },
    { from: "user", text: "john.smith@email.com" },
    { from: "agent", text: "✓ Verified. I found 3 available units at Oak Street. The 2BR is $1,850/mo, available Jan 1st." },
    { from: "user", text: "Great! Can I schedule a viewing for tomorrow?" },
    { from: "agent", text: "Perfect! I've scheduled your viewing for tomorrow at 2:00 PM. You'll receive a confirmation email with the access code." },
    { from: "system", text: "📧 Confirmation sent • Data encrypted and stored securely" },
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % (messages.length + 1));
    }, 2500);
    return () => clearInterval(timer);
  }, [messages.length]);

  // Auto-scroll to bottom when new messages appear
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messageIndex]);

  return (
    <div ref={scrollRef} className="flex h-full flex-col justify-end space-y-3 overflow-y-auto">
      {messages.slice(0, messageIndex).map((msg, i) => (
        <div
          key={i}
          className={cn(
            "animate-fade-in rounded-xl px-4 py-3 text-sm",
            msg.from === "user"
              ? "ml-8 bg-slate-100 text-slate-700"
              : msg.from === "system"
                ? "mx-4 border border-green-200 bg-green-50 text-center text-xs text-green-700"
                : "mr-8 bg-indigo-600 text-white"
          )}
        >
          {msg.text}
        </div>
      ))}
      {messageIndex < messages.length && messageIndex > 0 && (
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}

// Live Voice Demo Component - Delivery Return
function LiveVoiceDemo() {
  const [lineIndex, setLineIndex] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const conversation = [
    { speaker: "System", text: "🔒 Call authenticated via caller ID • Recording secured", isSystem: true },
    { speaker: "Customer", text: "Hi, I need to return my package. Wrong size was delivered." },
    { speaker: "AI Agent", text: "I understand. Let me verify your account. Can you confirm the last 4 digits of your phone number?" },
    { speaker: "Customer", text: "It's 4521" },
    { speaker: "AI Agent", text: "✓ Verified. I found order #ORD-78432. I'm scheduling a pickup for tomorrow between 9 AM - 12 PM." },
    { speaker: "Customer", text: "Will I get a full refund?" },
    { speaker: "AI Agent", text: "Yes, your full refund of $89.99 has been processed. You'll receive confirmation via email within 24 hours." },
    { speaker: "System", text: "📋 Transaction logged • PCI-DSS compliant • Data encrypted", isSystem: true },
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % (conversation.length + 1));
    }, 2800);
    return () => clearInterval(timer);
  }, [conversation.length]);

  // Auto-scroll to bottom when new messages appear
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [lineIndex]);

  return (
    <div ref={scrollRef} className="flex h-full flex-col justify-end space-y-3 overflow-y-auto">
      {conversation.slice(0, lineIndex).map((line, i) => (
        <div
          key={i}
          className={cn(
            "animate-fade-in",
            line.isSystem
              ? "mx-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-center text-xs text-green-700"
              : "flex items-start gap-3"
          )}
        >
          {!line.isSystem && (
            <>
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  line.speaker === "Customer"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-green-500 text-white"
                )}
              >
                {line.speaker === "Customer" ? "C" : "AI"}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500">{line.speaker}</p>
                <p className="text-sm text-slate-700">{line.text}</p>
              </div>
            </>
          )}
          {line.isSystem && line.text}
        </div>
      ))}
      {lineIndex < conversation.length && lineIndex > 0 && !conversation[lineIndex - 1]?.isSystem && (
        <div className="flex items-center gap-3 pl-11">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 animate-pulse rounded-full bg-green-400"
                style={{
                  animationDelay: `${i * 100}ms`,
                  height: `${12 + Math.sin(i * 1.5) * 8}px`,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400">Processing...</span>
        </div>
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="section-shell relative isolate overflow-hidden pb-20 pt-12 lg:pt-16"
    >
      {/* Subtle gradient background like Bujo */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" />

      {/* Center-aligned hero text like Bujo */}
      <div className="mx-auto max-w-4xl text-center">
        <h1
          id="hero-title"
          className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
        >
          AI for Enterprise Customer Communications
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          Deploy conversational AI that reduces contact center costs, cuts response times,
          and improves customer satisfaction across phone and chat.
        </p>
      </div>

      {/* Live Demo Cards - Moved here after description */}
      <div className="mx-auto mt-16 grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
        {/* AI Chat Agent Card */}
        <div className="flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">AI Chat Agent</h3>
                <p className="text-sm text-slate-500">Property rental deal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-slate-100 bg-white p-4">
            <LiveChatDemo />
          </div>

          {/* Security badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <Lock className="h-3 w-3" />
              End-to-End Encrypted
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <Shield className="h-3 w-3" />
              SOC2 Compliant
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <CheckCircle2 className="h-3 w-3" />
              Identity Verified
            </div>
          </div>
        </div>

        {/* AI Voice Agent Card */}
        <div className="flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">AI Voice Agent</h3>
                <p className="text-sm text-slate-500">Delivery return request</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-slate-100 bg-white p-4">
            <LiveVoiceDemo />
          </div>

          {/* Security badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <Database className="h-3 w-3" />
              PCI-DSS Compliant
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <Shield className="h-3 w-3" />
              HIPAA Ready
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              <Lock className="h-3 w-3" />
              Caller ID Auth
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <Button size="lg" asChild className="h-12 px-8 text-base">
          <a href="/contact">
            Book a Demo
            <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Trusted by section like Bujo */}
      <div className="mx-auto mt-20 max-w-4xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
          Trusted by industry leaders
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale">
          <div className="text-2xl font-bold text-slate-400">PropertyCo</div>
          <div className="text-2xl font-bold text-slate-400">HealthFirst</div>
          <div className="text-2xl font-bold text-slate-400">TechServ</div>
          <div className="text-2xl font-bold text-slate-400">LogiPro</div>
        </div>
      </div>
    </section>
  );
}
