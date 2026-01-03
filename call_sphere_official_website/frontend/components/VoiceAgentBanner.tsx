"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mic, MicOff, Phone, PhoneOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VoiceAgentCommandDetail } from "@/components/VoiceAgentLauncher";

const LANGUAGES = [
  "English",
  "हिंदी",
  "Español",
  "Français",
  "বাংলা",
  "العربية",
  "中文",
  "日本語",
  "Português",
  "Deutsch",
];

const LANGUAGE_CYCLE_MS = 2500;

export function VoiceAgentBanner() {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [languageIndex, setLanguageIndex] = useState(0);

  // Always cycle through languages (even when connected)
  useEffect(() => {
    const interval = setInterval(() => {
      setLanguageIndex((prev) => (prev + 1) % LANGUAGES.length);
    }, LANGUAGE_CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  const currentLanguage = useMemo(() => LANGUAGES[languageIndex], [languageIndex]);

  const dispatchVoiceAgentCommand = (detail: VoiceAgentCommandDetail) => {
    if (typeof window === "undefined") return;
    const voicedWindow = window as Window & {
      __voiceAgentReady?: boolean;
      __voiceAgentCommandQueue?: VoiceAgentCommandDetail[];
    };
    if (voicedWindow.__voiceAgentReady) {
      window.dispatchEvent(
        new CustomEvent("voice-agent-command", {
          detail,
        })
      );
      return;
    }

    voicedWindow.__voiceAgentCommandQueue = voicedWindow.__voiceAgentCommandQueue ?? [];
    voicedWindow.__voiceAgentCommandQueue.push(detail);
    setIsConnecting(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{
        isOpen: boolean;
        isListening: boolean;
        isConnected: boolean;
        isSpeaking: boolean;
        isLoading: boolean;
        isDisconnecting: boolean;
        hasError: boolean;
      }>).detail;
      if (!detail) return;
      setIsLive(detail.isConnected);
      setIsListening(detail.isListening);
      setIsConnecting(detail.isLoading);
      setIsDisconnecting(detail.isDisconnecting);
      setHasError(detail.hasError);
      setIsSpeaking(detail.isSpeaking);
    };
    window.addEventListener("voice-agent-status", handleStatus as EventListener);
    return () => window.removeEventListener("voice-agent-status", handleStatus as EventListener);
  }, []);

  const toggleAgent = () => {
    // Prevent clicks while transitioning
    if (isConnecting || isDisconnecting) return;

    // Optimistic update: show connecting state immediately
    if (!isLive) {
      setIsConnecting(true);
    } else {
      setIsDisconnecting(true);
    }

    dispatchVoiceAgentCommand({ action: "toggle" });
  };

  // Dynamic CTA text based on state
  const ctaText = isDisconnecting
    ? "Disconnecting..."
    : isConnecting
      ? "Connecting..."
      : isLive
        ? "Tap to end"
        : "Tap to talk to CallSphere";

  return (
    <section aria-label="Voice agent launcher">
      <motion.button
        type="button"
        onClick={toggleAgent}
        aria-pressed={isLive}
        aria-describedby="voice-agent-tooltip"
        title={isLive ? "Click to disconnect" : "Real-time AI voice agent · 57+ languages"}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "group relative flex w-full items-center justify-between gap-2 sm:gap-4 rounded-2xl border px-3 sm:px-6 py-3 sm:py-4 text-left shadow-sm transition-all duration-300",
          "border-gray-200",
          // Disable pointer events while transitioning
          (isConnecting || isDisconnecting) && "pointer-events-none",
          hasError
            ? "bg-gradient-to-r from-red-50 via-red-50 to-white border-red-300"
            : isDisconnecting
              ? "bg-gradient-to-r from-orange-50 via-orange-50 to-white border-orange-300"
              : isLive
                ? "bg-gradient-to-r from-emerald-50 via-emerald-50 to-white border-emerald-300 shadow-md"
                : isConnecting
                  ? "bg-gradient-to-r from-amber-50 via-amber-50 to-white border-amber-300"
                  : "bg-gradient-to-r from-gray-50 via-white to-white hover:border-gray-300 hover:shadow-md"
        )}
      >
        {/* Glow overlay on hover (only when not connected) */}
        {!isLive && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/0 via-gray-100/0 to-gray-50/0 opacity-0 transition-opacity duration-300 group-hover:from-gray-50/50 group-hover:via-gray-100/30 group-hover:to-gray-50/50 group-hover:opacity-100" />
        )}

        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Mic/Phone icon with animated glow rings */}
          <span className="relative flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center">
            {/* Outer pulsing ring */}
            <span
              className={cn(
                "absolute inset-0 rounded-lg sm:rounded-xl transition-colors duration-300",
                hasError
                  ? "bg-red-100"
                  : isDisconnecting
                    ? "bg-orange-100 animate-pulse"
                    : isLive
                      ? "bg-emerald-100"
                      : isConnecting
                        ? "bg-amber-100 animate-pulse"
                        : "bg-gray-100"
              )}
            />
            {/* Ripple effect when live and listening */}
            {isLive && isListening && !isSpeaking && (
              <span className="absolute inset-0 rounded-lg sm:rounded-xl bg-emerald-200 animate-ripple-out" />
            )}
            {/* Speaking animation rings */}
            {isLive && isSpeaking && (
              <>
                <span className="absolute inset-[-3px] sm:inset-[-4px] rounded-[0.625rem] sm:rounded-[1rem] border-2 border-emerald-300 animate-ping" />
                <span className="absolute inset-[-6px] sm:inset-[-8px] rounded-[0.875rem] sm:rounded-[1.25rem] border border-emerald-200 animate-pulse" />
              </>
            )}
            {/* Inner glow container */}
            <span
              className={cn(
                "relative flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300",
                hasError
                  ? "bg-red-200 shadow-sm"
                  : isDisconnecting
                    ? "bg-orange-200 shadow-sm"
                    : isLive
                      ? "bg-emerald-200 shadow-sm"
                      : isConnecting
                        ? "bg-amber-200 shadow-sm"
                        : "bg-gray-200 group-hover:bg-gray-300"
              )}
            >
              <AnimatePresence mode="wait">
                {isDisconnecting ? (
                  <motion.span
                    key="disconnecting"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -360] }}
                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                  >
                    <PhoneOff
                      aria-hidden
                      className="h-4 w-4 sm:h-5 sm:w-5 text-orange-700"
                    />
                  </motion.span>
                ) : isLive ? (
                  <motion.span
                    key="live"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PhoneOff
                      aria-hidden
                      className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700"
                    />
                  </motion.span>
                ) : hasError ? (
                  <motion.span
                    key="error"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MicOff
                      aria-hidden
                      className="h-4 w-4 sm:h-5 sm:w-5 text-red-700"
                    />
                  </motion.span>
                ) : isConnecting ? (
                  <motion.span
                    key="connecting"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 360] }}
                    transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}
                  >
                    <Phone
                      aria-hidden
                      className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700"
                    />
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Mic
                      aria-hidden
                      className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700"
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>

          <div className="min-w-0 flex-1">
            {/* Status line with language ticker */}
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
              <AnimatePresence mode="wait">
                {isDisconnecting ? (
                  <motion.span
                    key="disconnecting-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-orange-600"
                  >
                    Disconnecting...
                  </motion.span>
                ) : isLive ? (
                  <motion.span
                    key="live-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={cn(
                      "flex items-center gap-2",
                      isSpeaking ? "text-emerald-700" : "text-emerald-600"
                    )}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {isSpeaking ? "Agent speaking" : "Connected"}
                    <span className="hidden sm:inline text-emerald-400">·</span>
                    <span className="hidden sm:inline-flex items-center gap-1 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={languageIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.3 }}
                          className="text-emerald-600"
                        >
                          {currentLanguage}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-emerald-500 text-[10px]">+50 more</span>
                    </span>
                  </motion.span>
                ) : hasError ? (
                  <motion.span
                    key="error-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-red-600"
                  >
                    Connection lost
                  </motion.span>
                ) : isConnecting ? (
                  <motion.span
                    key="connecting-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-amber-600"
                  >
                    Connecting...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 text-slate-600"
                  >
                    <span>Voice assistant ready</span>
                    <span className="hidden sm:inline text-slate-400">·</span>
                    <span className="hidden sm:inline-flex items-center gap-1 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={languageIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.3 }}
                          className="text-slate-700"
                        >
                          {currentLanguage}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-slate-500 text-[10px]">+50 more</span>
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* CTA text */}
            <AnimatePresence mode="wait">
              <motion.span
                key={isLive ? "end" : "start"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mt-0.5 sm:mt-1 inline-flex items-center gap-1 sm:gap-2 text-base sm:text-xl font-semibold truncate",
                  isLive ? "text-emerald-700" : hasError ? "text-red-700" : "text-gray-900"
                )}
              >
                {ctaText}
                {!isLive && (
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                  />
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Hidden tooltip for screen readers */}
        <span id="voice-agent-tooltip" className="sr-only">
          {isLive
            ? "Voice agent is live and listening. Click to disconnect."
            : "Real-time AI voice agent supporting 57+ languages including English, Hindi, Spanish, French, Bengali, and more. Click to connect."}
        </span>
      </motion.button>
    </section>
  );
}
