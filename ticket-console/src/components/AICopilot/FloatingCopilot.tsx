"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  X,
  Terminal,
  MessageSquare,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Command,
  Zap,
  Send,
  History,
  Copy,
  Check,
  Play,
  Loader2,
  Bot,
  Keyboard,
  Shield,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Pause,
  Monitor,
  Server,
  Wifi,
  WifiOff,
  Settings,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

type ProposedCommand = {
  title: string;
  command: string;
  reason?: string;
  risk?: "low" | "medium" | "high";
  auto_approve?: boolean;
};

type TerminalLine = {
  id: string;
  type: "command" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
};

type CommandResult = {
  command: string;
  ok: boolean;
  stdout?: string;
  stderr?: string;
  reason?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  commands?: ProposedCommand[];
  status?: "investigating" | "need_more_info" | "resolved" | "escalate";
  nextStepHint?: string;
  confidence?: number;
  timestamp: Date;
};

type AgentStatus = "idle" | "thinking" | "waiting_approval" | "running" | "analyzing";

type Tab = "chat" | "terminal" | "history";
type Position = { x: number; y: number };
type TerminalTarget = "local" | "linux";
type TargetInfo = { id: string; name: string; status: "available" | "offline"; method?: string };

type SSHConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

const STORAGE_KEY = "ai-copilot-position";
const TRUST_MODE_KEY = "ai-copilot-trust-mode";
const TARGET_KEY = "ai-copilot-target";
const SSH_CONFIG_KEY = "ai-copilot-ssh-config";

export default function FloatingCopilot({ ticketId }: { ticketId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [input, setInput] = useState("");
  
  // Agentic state
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [trustMode, setTrustMode] = useState(false); // Auto-approve low-risk commands
  const [pendingCommands, setPendingCommands] = useState<ProposedCommand[]>([]);
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{role: string; content: string}[]>([]);
  
  // Target state (local Windows or Linux VM)
  const [target, setTarget] = useState<TerminalTarget>("local");
  const [targets, setTargets] = useState<TargetInfo[]>([
    { id: "local", name: "Local Windows", status: "available" },
    { id: "linux", name: "Linux VM (SSH)", status: "offline" },
  ]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  
  // SSH Configuration
  const [sshConfig, setSSHConfig] = useState<SSHConfig>({
    host: "localhost",
    port: 22,
    username: "root",
    password: "",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingSSH, setIsTestingSSH] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRunningCommand, setCurrentRunningCommand] = useState<string | null>(null);
  
  // Terminal state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // UI state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Load saved settings
  useEffect(() => {
    try {
      const savedPos = localStorage.getItem(STORAGE_KEY);
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        const maxX = window.innerWidth - 200;
        const maxY = window.innerHeight - 60;
        setPosition({
          x: Math.min(Math.max(24, parsed.x), maxX),
          y: Math.min(Math.max(24, parsed.y), maxY),
        });
      }
      const savedTrust = localStorage.getItem(TRUST_MODE_KEY);
      if (savedTrust) setTrustMode(JSON.parse(savedTrust));
      const savedTarget = localStorage.getItem(TARGET_KEY);
      if (savedTarget) setTarget(JSON.parse(savedTarget));
      const savedSSH = localStorage.getItem(SSH_CONFIG_KEY);
      if (savedSSH) setSSHConfig(JSON.parse(savedSSH));
    } catch {}
  }, []);

  // Save SSH config
  useEffect(() => {
    try { localStorage.setItem(SSH_CONFIG_KEY, JSON.stringify(sshConfig)); } catch {}
  }, [sshConfig]);

  // Load available targets on mount
  // Load targets (and refresh when SSH config changes)
  const loadTargets = useCallback(async () => {
    setIsLoadingTargets(true);
    try {
      const res = await fetch("/tms/api/agent-copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "list_targets",
          sshConfig: sshConfig.password ? sshConfig : undefined,
        }),
      });
      const data = await res.json();
      if (data?.result?.content?.[0]?.text) {
        const parsed = JSON.parse(data.result.content[0].text);
        if (parsed?.targets) {
          setTargets(parsed.targets);
        }
      }
    } catch (e) {
      console.error("Failed to load targets:", e);
    } finally {
      setIsLoadingTargets(false);
    }
  }, [sshConfig]);

  // Load on mount
  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  // Save target preference
  useEffect(() => {
    try { localStorage.setItem(TARGET_KEY, JSON.stringify(target)); } catch {}
  }, [target]);

  // Save position
  useEffect(() => {
    if (!isDragging) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(position)); } catch {}
    }
  }, [position, isDragging]);

  // Save trust mode
  useEffect(() => {
    try { localStorage.setItem(TRUST_MODE_KEY, JSON.stringify(trustMode)); } catch {}
  }, [trustMode]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX + position.x, y: clientY + position.y });
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const maxX = window.innerWidth - 200;
      const maxY = window.innerHeight - 60;
      setPosition({
        x: Math.min(Math.max(24, dragStart.x - clientX), maxX),
        y: Math.min(Math.max(24, dragStart.y - clientY), maxY),
      });
    };
    const handleEnd = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setShowCommandPalette(true);
      }
      if (e.key === "Escape") {
        if (showCommandPalette) setShowCommandPalette(false);
        else if (isOpen && !isExpanded) setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isExpanded, showCommandPalette]);

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [terminalLines]);

  // Focus input
  useEffect(() => {
    if (isOpen && activeTab === "chat") setTimeout(() => inputRef.current?.focus(), 100);
    else if (isOpen && activeTab === "terminal") setTimeout(() => terminalInputRef.current?.focus(), 100);
  }, [isOpen, activeTab]);

  const addTerminalLine = useCallback((type: TerminalLine["type"], content: string) => {
    setTerminalLines((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type, content, timestamp: new Date() },
    ]);
  }, []);

  // Execute a single command
  const executeCommand = useCallback(async (command: string): Promise<CommandResult> => {
    setCurrentRunningCommand(command);
    const targetLabel = target === "linux" ? "[linux]" : "[local]";
    addTerminalLine("command", `${targetLabel} ${command}`);
    setCommandHistory((prev) => [...prev.filter((c) => c !== command), command]);

    try {
      const res = await fetch("/tms/api/agent-copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ticketId, 
          command, 
          target,
          // Pass SSH config for Linux target
          sshConfig: target === "linux" ? sshConfig : undefined,
        }),
      });

      const data = await res.json();
      const toolResult = data?.result?.content?.[0]?.text
        ? JSON.parse(data.result.content[0].text)
        : data?.result?.content?.[0] ?? data?.result ?? data;

      const normalized = toolResult?.ok !== undefined ? toolResult
        : toolResult?.data?.ok !== undefined ? toolResult.data
        : { ok: false, reason: "Unexpected response format" };

      if (normalized.ok) {
        if (normalized.stdout) addTerminalLine("output", normalized.stdout);
        // Show stderr as info (not error) when command succeeded
        if (normalized.stderr) addTerminalLine("system", `[info] ${normalized.stderr}`);
        if (!normalized.stdout && !normalized.stderr) addTerminalLine("output", "Command completed (no output)");
      } else {
        // Command actually failed
        if (normalized.stdout) addTerminalLine("output", normalized.stdout);
        if (normalized.stderr) addTerminalLine("error", `[stderr] ${normalized.stderr}`);
        addTerminalLine("error", normalized.reason ?? normalized.error ?? "Command failed");
      }

      return { command, ok: normalized.ok, stdout: normalized.stdout, stderr: normalized.stderr, reason: normalized.reason };
    } catch (e: any) {
      addTerminalLine("error", e?.message ?? "Execute failed");
      return { command, ok: false, reason: e?.message ?? "Execute failed" };
    } finally {
      setCurrentRunningCommand(null);
    }
  }, [ticketId, target, sshConfig, addTerminalLine]);

  // Run approved commands and analyze results
  const runApprovedCommands = useCallback(async (commands: ProposedCommand[]) => {
    if (commands.length === 0) return;
    
    setAgentStatus("running");
    setActiveTab("terminal");
    addTerminalLine("system", `Running ${commands.length} approved command(s)...`);

    const results: CommandResult[] = [];
    for (const cmd of commands) {
      const result = await executeCommand(cmd.command);
      results.push(result);
    }

    setCommandResults(results);
    setPendingCommands([]);

    // Auto-analyze results
    setAgentStatus("analyzing");
    addTerminalLine("system", "Analyzing results...");

    try {
      const res = await fetch("/tms/api/agent-copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          mode: "analyze",
          commandResults: results,
          conversationHistory,
          target, // Pass selected target so AI suggests correct commands
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analysis failed");

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}`,
        role: "assistant",
        content: data.answer ?? "",
        commands: Array.isArray(data.proposed_commands) ? data.proposed_commands : [],
        status: data.status,
        nextStepHint: data.next_step_hint,
        confidence: data.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory((prev) => [...prev, { role: "assistant", content: data.answer }]);

      // Handle new commands
      if (assistantMessage.commands && assistantMessage.commands.length > 0) {
        const autoApprove = assistantMessage.commands.filter(c => trustMode && (c.auto_approve || c.risk === "low"));
        const needApproval = assistantMessage.commands.filter(c => !trustMode || (!c.auto_approve && c.risk !== "low"));

        if (autoApprove.length > 0) {
          addTerminalLine("system", `Auto-running ${autoApprove.length} low-risk command(s)...`);
          await runApprovedCommands(autoApprove);
        }

        if (needApproval.length > 0) {
          setPendingCommands(needApproval);
          setAgentStatus("waiting_approval");
          addTerminalLine("system", `Waiting for approval on ${needApproval.length} command(s)`);
        } else if (autoApprove.length === 0) {
          setAgentStatus("idle");
        }
      } else {
        setAgentStatus("idle");
      }

      // Switch to chat if resolved or escalated
      if (assistantMessage.status === "resolved" || assistantMessage.status === "escalate") {
        setActiveTab("chat");
      }

    } catch (e: any) {
      const errorMessage: ChatMessage = {
        id: `${Date.now()}`,
        role: "assistant",
        content: `Analysis error: ${e?.message ?? "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAgentStatus("idle");
    }
  }, [ticketId, conversationHistory, trustMode, target, executeCommand, addTerminalLine]);

  // Send initial message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || agentStatus === "thinking") return;
    
    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [...prev, { role: "user", content: input.trim() }]);
    setInput("");
    setAgentStatus("thinking");
    setShowCommandPalette(false);
    setPendingCommands([]);
    setCommandResults([]);

    try {
      const res = await fetch("/tms/api/agent-copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          message: userMessage.content,
          mode: "chat",
          conversationHistory,
          target, // Pass selected target so AI suggests correct commands
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Chat failed");

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}`,
        role: "assistant",
        content: data.answer ?? "",
        commands: Array.isArray(data.proposed_commands) ? data.proposed_commands : [],
        status: data.status,
        nextStepHint: data.next_step_hint,
        confidence: data.confidence,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory((prev) => [...prev, { role: "assistant", content: data.answer }]);

      // Handle commands
      if (assistantMessage.commands && assistantMessage.commands.length > 0) {
        const autoApprove = assistantMessage.commands.filter(c => trustMode && (c.auto_approve || c.risk === "low"));
        const needApproval = assistantMessage.commands.filter(c => !trustMode || (!c.auto_approve && c.risk !== "low"));

        if (autoApprove.length > 0) {
          addTerminalLine("system", `Auto-running ${autoApprove.length} low-risk command(s)...`);
          await runApprovedCommands(autoApprove);
        }

        if (needApproval.length > 0) {
          setPendingCommands(needApproval);
          setAgentStatus("waiting_approval");
          addTerminalLine("system", `AI suggested ${needApproval.length} command(s) - waiting for approval`);
        } else if (autoApprove.length === 0) {
          setAgentStatus("idle");
        }
      } else {
        setAgentStatus("idle");
      }
    } catch (e: any) {
      const errorMessage: ChatMessage = {
        id: `${Date.now()}`,
        role: "assistant",
        content: `Error: ${e?.message ?? "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAgentStatus("idle");
    }
  }, [input, agentStatus, ticketId, conversationHistory, trustMode, target, addTerminalLine, runApprovedCommands]);

  // Approve single command
  const approveCommand = useCallback(async (cmd: ProposedCommand) => {
    setPendingCommands((prev) => prev.filter((c) => c.command !== cmd.command));
    await runApprovedCommands([cmd]);
  }, [runApprovedCommands]);

  // Approve all pending commands
  const approveAllCommands = useCallback(async () => {
    const toRun = [...pendingCommands];
    await runApprovedCommands(toRun);
  }, [pendingCommands, runApprovedCommands]);

  // Reject command
  const rejectCommand = useCallback((cmd: ProposedCommand) => {
    setPendingCommands((prev) => prev.filter((c) => c.command !== cmd.command));
    addTerminalLine("system", `Rejected: ${cmd.command}`);
    if (pendingCommands.length <= 1) setAgentStatus("idle");
  }, [pendingCommands, addTerminalLine]);

  // Manual terminal command
  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && terminalInput.trim() && !currentRunningCommand) {
      executeCommand(terminalInput.trim());
      setTerminalInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setTerminalInput(commandHistory[commandHistory.length - historyIndex] || "");
      } else {
        setHistoryIndex(-1);
        setTerminalInput("");
      }
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRiskBadge = (risk?: "low" | "medium" | "high") => ({
    low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    high: "bg-red-500/20 text-red-300 border-red-500/30",
  }[risk || "low"]);

  const getStatusBadge = (status?: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode; text: string }> = {
      investigating: { bg: "bg-blue-500/20 text-blue-300", icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Investigating" },
      need_more_info: { bg: "bg-amber-500/20 text-amber-300", icon: <AlertTriangle className="w-3 h-3" />, text: "Need Info" },
      resolved: { bg: "bg-emerald-500/20 text-emerald-300", icon: <CheckCircle className="w-3 h-3" />, text: "Resolved" },
      escalate: { bg: "bg-red-500/20 text-red-300", icon: <XCircle className="w-3 h-3" />, text: "Escalate" },
    };
    return styles[status || "investigating"] || styles.investigating;
  };

  const getAgentStatusText = () => {
    const texts: Record<AgentStatus, string> = {
      idle: "Ready",
      thinking: "Thinking...",
      waiting_approval: `Waiting approval (${pendingCommands.length})`,
      running: "Running commands...",
      analyzing: "Analyzing results...",
    };
    return texts[agentStatus];
  };

  const quickActions = [
    { label: "Diagnose this ticket", command: "What's wrong with this ticket? Run diagnostics." },
    { label: "Check network", command: "Run network diagnostics" },
    { label: "Check system health", command: "Check system health and resources" },
  ];

  // Closed state - Floating button
  if (!isOpen) {
    return (
      <div
        className="fixed z-50 group"
        style={{ bottom: position.y, right: position.x, cursor: isDragging ? "grabbing" : "default" }}
      >
        <div className="relative flex items-center">
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full px-1.5 py-2 bg-gray-800/90 rounded-l-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all ${isDragging ? "opacity-100 bg-violet-600" : ""}`}
          >
            <GripHorizontal className="w-4 h-4 text-gray-400" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
          <button
            ref={buttonRef}
            onClick={() => !isDragging && setIsOpen(true)}
            className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-violet-500/25 transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI Copilot</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
        </div>
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded shadow-lg">
            Drag to move • <kbd className="bg-gray-700 px-1 rounded">⌘K</kbd> to open
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isExpanded && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsExpanded(false)} />}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)} />
          <div className="relative w-full max-w-xl mx-4 bg-[#1a1b26] border border-[#414868] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#414868]">
              <Command className="w-5 h-5 text-violet-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask AI to diagnose the issue..."
                className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none text-sm"
                autoFocus
              />
              {input && (
                <button onClick={sendMessage} className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg">
                  <Send className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-auto">
              <div className="px-3 py-2 text-xs text-gray-500 uppercase">Quick Start</div>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => { setInput(action.command); setShowCommandPalette(false); setTimeout(sendMessage, 100); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#24283b] text-left"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-gray-200">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#414868] text-xs text-gray-500">
              <span><kbd className="bg-[#24283b] px-1.5 py-0.5 rounded">↵</kbd> to send</span>
              <Keyboard className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* SSH Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md mx-4 bg-[#1a1b26] border border-[#414868] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#414868]">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-violet-400" />
                <h3 className="font-medium text-gray-200">SSH Configuration</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-[#414868] rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Enter SSH credentials to connect to Linux systems (WSL, VMs, remote servers).
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Host</label>
                  <input
                    type="text"
                    value={sshConfig.host}
                    onChange={(e) => setSSHConfig({ ...sshConfig, host: e.target.value })}
                    placeholder="localhost"
                    className="w-full px-3 py-2 bg-[#24283b] border border-[#414868] rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={sshConfig.port}
                    onChange={(e) => setSSHConfig({ ...sshConfig, port: parseInt(e.target.value) || 22 })}
                    className="w-full px-3 py-2 bg-[#24283b] border border-[#414868] rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Username</label>
                <input
                  type="text"
                  value={sshConfig.username}
                  onChange={(e) => setSSHConfig({ ...sshConfig, username: e.target.value })}
                  placeholder="root"
                  className="w-full px-3 py-2 bg-[#24283b] border border-[#414868] rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={sshConfig.password}
                    onChange={(e) => setSSHConfig({ ...sshConfig, password: e.target.value })}
                    placeholder="Enter SSH password"
                    className="w-full px-3 py-2 bg-[#24283b] border border-[#414868] rounded-lg text-gray-200 text-sm outline-none focus:border-violet-500 pr-10"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 Connect to WSL, VMs, or remote Linux servers via SSH.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#414868]">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  addTerminalLine("system", `SSH configured: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`);
                  // Refresh targets to check if SSH connection works
                  setTimeout(() => loadTargets(), 100);
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div
        className={`fixed z-50 transition-all duration-300 ${isExpanded ? "inset-4 md:inset-8" : "w-[480px] h-[650px]"}`}
        style={isExpanded ? undefined : { bottom: position.y, right: position.x }}
      >
        <div className="h-full flex flex-col bg-[#1a1b26] rounded-2xl shadow-2xl border border-[#414868] overflow-hidden">
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#24283b] to-[#1a1b26] border-b border-[#414868] ${!isExpanded ? "cursor-grab active:cursor-grabbing" : ""}`}
            onMouseDown={!isExpanded ? handleDragStart : undefined}
            onTouchStart={!isExpanded ? handleDragStart : undefined}
          >
            <div className="flex items-center gap-3">
              {!isExpanded && (
                <div className="flex flex-col gap-0.5 mr-1 opacity-40">
                  {[0,1,2].map(i => <div key={i} className="flex gap-0.5">{[0,1].map(j => <div key={j} className="w-1 h-1 bg-gray-400 rounded-full"/>)}</div>)}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 rounded-lg blur-md opacity-50" />
                <div className="relative p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-100">AI Copilot</h3>
                <p className="text-xs text-gray-500">{getAgentStatusText()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Target Selector */}
              <div className="flex items-center bg-[#1a1b26] rounded-lg p-0.5 mr-1">
                <button
                  onClick={() => setTarget("local")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                    target === "local" 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  title="Local Windows"
                >
                  <Monitor className="w-3 h-3" />
                  <span className="hidden sm:inline">Local</span>
                </button>
                <button
                  onClick={() => setTarget("linux")}
                  disabled={targets.find(t => t.id === "linux")?.status === "offline"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                    target === "linux" 
                      ? "bg-orange-600 text-white" 
                      : targets.find(t => t.id === "linux")?.status === "offline"
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 hover:text-gray-200"
                  }`}
                  title={
                    targets.find(t => t.id === "linux")?.status === "offline" 
                      ? `Offline: ${(targets.find(t => t.id === "linux") as any)?.hint || "Click ⚙️ to configure SSH"}`
                      : "Linux VM (SSH)"
                  }
                >
                  <Server className="w-3 h-3" />
                  <span className="hidden sm:inline">Linux</span>
                  {targets.find(t => t.id === "linux")?.status === "offline" ? (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  ) : targets.find(t => t.id === "linux")?.status === "available" && (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  )}
                </button>
              </div>
              
              {/* Trust Mode Toggle */}
              <button
                onClick={() => setTrustMode(!trustMode)}
                className={`p-2 rounded-lg transition-colors ${trustMode ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-[#414868] text-gray-400"}`}
                title={trustMode ? "Auto-run ON (low-risk)" : "Auto-run OFF"}
              >
                {trustMode ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </button>
              {/* SSH Settings */}
              <button 
                onClick={() => setShowSettings(true)} 
                className={`p-2 rounded-lg transition-colors ${sshConfig.password ? "text-emerald-400" : "text-gray-400"} hover:bg-[#414868] hover:text-gray-200`}
                title="SSH Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => setShowCommandPalette(true)} className="p-2 hover:bg-[#414868] rounded-lg text-gray-400 hover:text-gray-200">
                <Command className="w-4 h-4" />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-[#414868] rounded-lg text-gray-400 hover:text-gray-200">
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[#414868] rounded-lg text-gray-400 hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pending Commands Banner */}
          {pendingCommands.length > 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 text-sm">
                  <Pause className="w-4 h-4" />
                  <span>{pendingCommands.length} command(s) waiting for approval</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={approveAllCommands}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Approve All
                  </button>
                  <button
                    onClick={() => { setPendingCommands([]); setAgentStatus("idle"); }}
                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs rounded-lg flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> Reject All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[#414868]">
            {[
              { id: "chat" as Tab, icon: MessageSquare, label: "Chat" },
              { id: "terminal" as Tab, icon: Terminal, label: "Terminal" },
              { id: "history" as Tab, icon: History, label: "History" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/10" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <div className="p-4 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl mb-4">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                      </div>
                      <h4 className="text-gray-200 font-medium mb-2">Agentic AI Copilot</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        I'll diagnose issues, run commands (with your approval), and keep troubleshooting until resolved.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        {trustMode ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Shield className="w-4 h-4" />}
                        <span>Auto-run: {trustMode ? "ON (low-risk)" : "OFF"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["Diagnose issue", "Run network check", "What's wrong?"].map((q) => (
                          <button
                            key={q}
                            onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
                            className="px-3 py-1.5 bg-[#24283b] hover:bg-[#414868] text-gray-300 text-xs rounded-full"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-violet-600 text-white" : "bg-[#24283b] text-gray-200"}`}>
                        {/* Status Badge */}
                        {msg.role === "assistant" && msg.status && (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs mb-2 ${getStatusBadge(msg.status).bg}`}>
                            {getStatusBadge(msg.status).icon}
                            {getStatusBadge(msg.status).text}
                            {msg.confidence && <span className="opacity-70">({Math.round(msg.confidence * 100)}%)</span>}
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        
                        {msg.nextStepHint && (
                          <p className="text-xs text-gray-400 mt-2 italic">Next: {msg.nextStepHint}</p>
                        )}
                        
                        {/* Commands in message */}
                        {msg.commands && msg.commands.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.commands.map((cmd, idx) => {
                              const isPending = pendingCommands.some(p => p.command === cmd.command);
                              return (
                                <div key={idx} className="bg-[#1a1b26] rounded-xl p-3 border border-[#414868]">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-300">{cmd.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRiskBadge(cmd.risk)}`}>
                                      {cmd.risk || "low"} risk
                                    </span>
                                  </div>
                                  <code className="block text-xs bg-[#0d1117] text-emerald-400 px-2 py-1.5 rounded font-mono mb-2">
                                    {cmd.command}
                                  </code>
                                  {isPending && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => approveCommand(cmd)}
                                        disabled={agentStatus === "running"}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded-lg"
                                      >
                                        <CheckCircle className="w-3 h-3" /> Approve
                                      </button>
                                      <button
                                        onClick={() => rejectCommand(cmd)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs rounded-lg"
                                      >
                                        <XCircle className="w-3 h-3" /> Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(agentStatus === "thinking" || agentStatus === "analyzing") && (
                    <div className="flex justify-start">
                      <div className="bg-[#24283b] rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        <span className="text-sm text-gray-400">{agentStatus === "thinking" ? "Thinking..." : "Analyzing results..."}</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-[#414868]">
                  <div className="flex items-center gap-2 bg-[#24283b] rounded-xl px-3 py-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Ask about the ticket or request diagnostics..."
                      className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none text-sm"
                      disabled={agentStatus === "thinking" || agentStatus === "analyzing"}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || agentStatus === "thinking" || agentStatus === "analyzing"}
                      className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Tab */}
            {activeTab === "terminal" && (
              <div className="h-full flex flex-col bg-[#0d1117]">
                <div className="flex-1 overflow-auto p-3 font-mono text-sm">
                  {terminalLines.length === 0 && (
                    <div className="text-gray-600">
                      <p className="text-emerald-500">AI Copilot Terminal</p>
                      <p className="text-xs mt-1">Commands will appear here as AI runs diagnostics</p>
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <span className="text-gray-500">Target:</span>
                        {target === "local" ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                            <Monitor className="w-3 h-3" /> Local Windows
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded">
                            <Server className="w-3 h-3" /> Linux VM (SSH)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {terminalLines.map((line) => (
                    <div key={line.id} className={`flex items-start gap-2 ${line.type === "command" ? "mt-2 first:mt-0" : ""}`}>
                      <div className={`flex-1 ${
                        line.type === "command" ? "text-emerald-400" :
                        line.type === "error" ? "text-red-400" :
                        line.type === "system" ? "text-amber-400" : "text-gray-400"
                      }`}>
                        {line.type === "command" && <span className="text-gray-600">$ </span>}
                        {line.type === "error" && <span className="text-red-600">✗ </span>}
                        {line.type === "system" && <span className="text-amber-600">→ </span>}
                        <span className="whitespace-pre-wrap break-all">{line.content}</span>
                      </div>
                    </div>
                  ))}
                  {currentRunningCommand && (
                    <div className="flex items-center gap-2 text-amber-400 mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Running...</span>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border-t border-[#30363d] bg-[#161b22]">
                  <span className={`font-mono text-sm ${target === "linux" ? "text-orange-400" : "text-emerald-400"}`}>
                    {target === "linux" ? "🐧" : ">"} $
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    disabled={!!currentRunningCommand}
                    placeholder={currentRunningCommand ? "Running..." : `Type ${target === "linux" ? "Linux" : "Windows"} command...`}
                    className="flex-1 bg-transparent text-gray-200 font-mono text-sm outline-none placeholder-gray-600 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div className="h-full overflow-auto p-4">
                {commandHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <History className="w-8 h-8 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No command history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase mb-3">Recent Commands</p>
                    {[...commandHistory].reverse().map((cmd, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-[#24283b] hover:bg-[#414868] rounded-xl">
                        <code className="flex-1 text-sm text-emerald-400 font-mono truncate">{cmd}</code>
                        <button onClick={() => copyText(cmd, `hist-${idx}`)} className="p-1.5 hover:bg-[#1a1b26] rounded-lg text-gray-500">
                          {copiedId === `hist-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={() => executeCommand(cmd)} disabled={!!currentRunningCommand} className="p-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg">
                          <Play className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
