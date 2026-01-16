"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Building2, Stethoscope, Monitor, Truck, Mic, PhoneOff } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const SAMPLE_RATE = 24000;

const industries = [
  {
    name: "Property Management",
    icon: Building2,
    voiceUrl: "wss://realestate.callsphere.tech",
    description: "Automate maintenance triage, leasing qualification, and rent inquiries. Handle high call volumes 24/7 so your team can focus on growth.",
    features: ["Maintenance Triage", "Leasing Qualification", "Rent & Payment Support"],
    stat: "95%",
    statLabel: "requests triaged",
  },
  {
    name: "Healthcare & Dental",
    icon: Stethoscope,
    voiceUrl: "wss://healthcare.callsphere.tech",
    description: "Manage appointments, verify insurance, and reduce no-shows with proactive reminders. Every patient call answered.",
    features: ["Appointment Scheduling", "Insurance Verification", "No-Show Reduction"],
    stat: "40%",
    statLabel: "fewer no-shows",
  },
  {
    name: "IT Support",
    icon: Monitor,
    voiceUrl: "wss://webhook.callsphere.tech",
    description: "Deflect Tier-1 tickets, auto-create categorized tickets, and provide instant status updates without human intervention.",
    features: ["Ticket Triage & Creation", "Smart Escalation", "Status Updates"],
    stat: "60%",
    statLabel: "faster resolution",
  },
  {
    name: "Logistics & Delivery",
    icon: Truck,
    comingSoon: true,
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

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextPlayTimeRef = useRef(0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const playAudio = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return;
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      const buffer = audioContextRef.current.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  }, []);

  const startAudioCapture = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(pcm.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      wsRef.current.send(JSON.stringify({ type: "audio", audio: btoa(binary) }));
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
  }, []);

  const endCall = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: "end" })); } catch {}
      wsRef.current.close();
    }
    wsRef.current = null;
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = null;
    if (processorRef.current) processorRef.current.disconnect();
    processorRef.current = null;
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    setCallState("idle");
    setActiveIndustry(null);
    setDuration(0);
    nextPlayTimeRef.current = 0;
  }, []);

  const startCall = useCallback(async (voiceUrl: string, industryName: string) => {
    // End any existing call first
    if (callState !== "idle") {
      endCall();
      return;
    }

    setCallState("connecting");
    setActiveIndustry(industryName);
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: SAMPLE_RATE });

      const ws = new WebSocket(`${voiceUrl}/ws/voice`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ready") {
            setCallState("connected");
            nextPlayTimeRef.current = 0;
            durationIntervalRef.current = setInterval(() => setDuration((p) => p + 1), 1000);
            startAudioCapture();
          } else if (data.type === "audio") {
            playAudio(data.audio);
          } else if (data.type === "error") {
            endCall();
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.onerror = () => endCall();
      ws.onclose = () => endCall();
    } catch (err: unknown) {
      console.error("Microphone error:", err);
      setCallState("idle");
      setActiveIndustry(null);
    }
  }, [callState, playAudio, startAudioCapture, endCall]);

  const handleVoiceClick = (voiceUrl: string, industryName: string) => {
    if (activeIndustry === industryName && callState !== "idle") {
      endCall();
    } else {
      if (callState !== "idle") {
        endCall();
      }
      startCall(voiceUrl, industryName);
    }
  };

  useEffect(() => {
    return () => endCall();
  }, [endCall]);

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
            const Icon = industry.icon;
            const isVoiceDemo = "voiceUrl" in industry && industry.voiceUrl;
            const isComingSoon = "comingSoon" in industry && industry.comingSoon;
            const industryCallState = getCallStateForIndustry(industry.name);

            const cardBase = "flex h-[180px] flex-col items-center rounded-2xl border p-5 text-center shadow-sm";
            const iconBase = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white";
            const titleBase = "mt-3 line-clamp-2 h-10 w-full text-sm font-semibold leading-5 text-slate-900";
            const actionBase = "mt-auto flex h-6 items-center justify-center text-sm font-bold";

            if (isComingSoon) {
              return (
                <div
                  key={industry.name}
                  className={`${cardBase} border-slate-200 bg-gradient-to-b from-slate-50 to-white`}
                >
                  <div className={`${iconBase} bg-slate-400`}>
                    <Mic className="h-5 w-5" />
                  </div>
                  <p className={titleBase}>{industry.name}</p>
                  <p className={`${actionBase} text-slate-400`}>Coming Soon</p>
                </div>
              );
            }

            return isVoiceDemo ? (
              <button
                key={industry.name}
                onClick={() => handleVoiceClick(industry.voiceUrl!, industry.name)}
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
            ) : (
              <a
                key={industry.name}
                href={`tel:${industry.phone?.replace(/[^+\d]/g, "")}`}
                className={`${cardBase} border-slate-200 bg-white transition-all hover:border-indigo-300 hover:shadow-md`}
              >
                <div className={`${iconBase} bg-indigo-600`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={titleBase}>{industry.name}</p>
                <p className={`${actionBase} text-indigo-600`}>{industry.phone}</p>
              </a>
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
