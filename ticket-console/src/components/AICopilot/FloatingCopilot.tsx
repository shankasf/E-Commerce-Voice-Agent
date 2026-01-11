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
  Globe,
  ChevronDown,
} from "lucide-react";
import { remoteDeviceAPI } from "@/lib/remoteDeviceAPI";

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
type TerminalTarget = "local" | "remote";
type TargetInfo = { id: string; name: string; status: "available" | "offline"; method?: string };

const STORAGE_KEY = "ai-copilot-position";
const TRUST_MODE_KEY = "ai-copilot-trust-mode";
const TARGET_KEY = "ai-copilot-target";

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
  
  // Target state (local Windows or Remote Device)
  const [target, setTarget] = useState<TerminalTarget>("local");
  
  // Remote device state
  const [remoteDevices, setRemoteDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [availableDiagnostics, setAvailableDiagnostics] = useState<any[]>([]);
  
  
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
    } catch {}
  }, []);

  // Load remote devices for current ticket
  const loadRemoteDevices = useCallback(async () => {
    if (!ticketId) {
      console.warn('[FloatingCopilot] No ticketId provided, skipping remote device load');
      return;
    }
    setIsLoadingDevices(true);
    try {
      console.log('[FloatingCopilot] Loading devices for ticket:', ticketId);
      const result = await remoteDeviceAPI.getDevices(parseInt(ticketId));
      console.log('[FloatingCopilot] Devices loaded:', result);
      if (result.ok && result.devices) {
        setRemoteDevices(result.devices);
        console.log('[FloatingCopilot] Set devices:', result.devices.length);
        // Auto-select first online device if none selected
        if (!selectedDeviceId && result.devices.length > 0) {
          const onlineDevice = result.devices.find((d: any) => d.connected && d.status === 'active');
          if (onlineDevice) {
            console.log('[FloatingCopilot] Auto-selecting online device:', onlineDevice.device_id);
            setSelectedDeviceId(onlineDevice.device_id);
          } else if (result.devices.length > 0) {
            console.log('[FloatingCopilot] Auto-selecting first device:', result.devices[0].device_id);
            setSelectedDeviceId(result.devices[0].device_id);
          }
        }
      } else {
        console.warn('[FloatingCopilot] Failed to load devices:', result.error);
        setRemoteDevices([]);
      }
    } catch (e) {
      console.error("[FloatingCopilot] Failed to load remote devices:", e);
      setRemoteDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [ticketId, selectedDeviceId]);

  // Load available diagnostics
  const loadDiagnostics = useCallback(async () => {
    try {
      const result = await remoteDeviceAPI.listDiagnostics();
      if (result.ok && result.diagnostics) {
        setAvailableDiagnostics(result.diagnostics);
      }
    } catch (e) {
      console.error("Failed to load diagnostics:", e);
    }
  }, []);

  // Map command string to diagnostic ID
  const mapCommandToDiagnostic = useCallback((command: string): { diagnosticId: string; params?: Record<string, string> } | null => {
    const cmdLower = command.toLowerCase().trim();
    
    // Extract parameters from commands
    const pingMatch = cmdLower.match(/ping\s+(?:-n\s+\d+\s+)?([^\s]+)/);
    if (pingMatch) {
      return { diagnosticId: 'network_ping', params: { host: pingMatch[1] } };
    }
    
    const tracertMatch = cmdLower.match(/tracert\s+([^\s]+)/);
    if (tracertMatch) {
      return { diagnosticId: 'network_tracert', params: { host: tracertMatch[1] } };
    }
    
    const nslookupMatch = cmdLower.match(/nslookup\s+([^\s]+)/);
    if (nslookupMatch) {
      return { diagnosticId: 'network_nslookup', params: { domain: nslookupMatch[1] } };
    }
    
    // Direct command mappings
    const mappings: Record<string, string> = {
      'ipconfig /all': 'network_ipconfig',
      'ipconfig': 'network_ipconfig',
      'ipconfig /release': 'network_ipconfig_release',
      'ipconfig /renew': 'network_ipconfig_renew',
      'ipconfig /flushdns': 'network_flushdns',
      'netstat': 'network_netstat',
      'netstat -an': 'network_netstat',
      'arp -a': 'network_arp',
      'hostname': 'system_hostname',
      'whoami': 'system_whoami',
      'systeminfo': 'system_info',
      'tasklist': 'system_tasklist',
      'sc query': 'system_services',
      'wmic logicaldisk get size,freespace,caption': 'disk_info',
    };
    
    if (mappings[cmdLower]) {
      return { diagnosticId: mappings[cmdLower] };
    }
    
    // Try to find by partial match
    for (const [key, value] of Object.entries(mappings)) {
      if (cmdLower.includes(key.split(' ')[0])) {
        return { diagnosticId: value };
      }
    }
    
    return null;
  }, []);

  // Save target preference
  useEffect(() => {
    try { localStorage.setItem(TARGET_KEY, JSON.stringify(target)); } catch {}
  }, [target]);

  // Load remote devices on mount and when ticketId changes
  useEffect(() => {
    if (ticketId) {
      loadRemoteDevices();
      loadDiagnostics();
    }
  }, [ticketId, loadRemoteDevices, loadDiagnostics]);

  // Reload devices when target changes to remote
  useEffect(() => {
    if (target === "remote" && ticketId) {
      loadRemoteDevices();
    }
  }, [target, ticketId, loadRemoteDevices]);

  // Initial load of diagnostics
  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

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
    
    // Handle remote execution
    if (target === "remote") {
      if (!selectedDeviceId) {
        addTerminalLine("error", "No remote device selected");
        setCurrentRunningCommand(null);
        return { command, ok: false, reason: "No remote device selected" };
      }

      // Try to map command to diagnostic first, fallback to raw execution
      const diagnostic = mapCommandToDiagnostic(command);
      const selectedDevice = remoteDevices.find((d: any) => d.device_id === selectedDeviceId);
      const deviceLabel = selectedDevice ? `[${selectedDevice.device_name}]` : "[remote]";
      
      setCommandHistory((prev) => [...prev.filter((c) => c !== command), command]);

      try {
        let result;
        
        if (diagnostic) {
          // Use diagnostic if available
          addTerminalLine("command", `${deviceLabel} ${command} → ${diagnostic.diagnosticId}`);
          addTerminalLine("system", `Executing diagnostic: ${diagnostic.diagnosticId}...`);
          result = await remoteDeviceAPI.executeDiagnostic(
            selectedDeviceId,
            diagnostic.diagnosticId,
            diagnostic.params
          );
        } else {
          // Use raw command execution (with blacklist validation)
          addTerminalLine("command", `${deviceLabel} ${command} (raw)`);
          addTerminalLine("system", `Executing raw command (blacklist-protected)...`);
          result = await remoteDeviceAPI.executeRawCommand(
            selectedDeviceId,
            command,
            30 // timeout
          );
        }

        if (result.ok && result.result) {
          const { success, stdout, stderr, exit_code, truncated, redactions, warnings, execution_time_ms, error } = result.result;
          
          if (stdout) addTerminalLine("output", stdout);
          if (stderr) addTerminalLine("error", stderr);
          if (error) addTerminalLine("error", `Error: ${error}`);
          if (truncated) addTerminalLine("system", "[Output was truncated]");
          if (redactions && redactions > 0) addTerminalLine("system", `[${redactions} sensitive value(s) redacted]`);
          if (warnings && warnings.length > 0) {
            warnings.forEach((w: string) => addTerminalLine("system", `[Warning] ${w}`));
          }
          if (execution_time_ms) addTerminalLine("system", `Execution time: ${execution_time_ms}ms`);
          
          if (!stdout && !stderr && !error) {
            addTerminalLine("output", success ? "Command completed (no output)" : "Command failed (no output)");
          }

          return {
            command,
            ok: success,
            stdout: stdout || "",
            stderr: stderr || "",
            reason: success ? undefined : (error || `Exit code: ${exit_code}`),
          };
        } else {
          const errorMsg = result.error || "Remote execution failed";
          addTerminalLine("error", errorMsg);
          console.error("[FloatingCopilot] Remote execution failed:", result);
          return { command, ok: false, reason: errorMsg };
        }
      } catch (e: any) {
        const errorMsg = e?.message ?? "Remote execution failed";
        addTerminalLine("error", errorMsg);
        console.error("[FloatingCopilot] Remote execution exception:", e);
        return { command, ok: false, reason: errorMsg };
      } finally {
        setCurrentRunningCommand(null);
      }
    }

    // Handle local execution
    const targetLabel = "[local]";
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
  }, [ticketId, target, addTerminalLine, selectedDeviceId, remoteDevices, mapCommandToDiagnostic]);

  // Run approved commands and analyze results with conversational analysis
  const runApprovedCommands = useCallback(async (commands: ProposedCommand[], depth: number = 0) => {
    if (commands.length === 0) return;
    
    // Prevent infinite loops (max 10 iterations)
    if (depth > 10) {
      addTerminalLine("system", "⚠️ Maximum auto-continuation depth reached. Stopping.");
      setAgentStatus("idle");
      return;
    }
    
    setAgentStatus("running");
    setActiveTab("terminal");
    if (depth === 0) {
      addTerminalLine("system", `Running ${commands.length} approved command(s)...`);
    }

    const results: CommandResult[] = [];
    
    // Execute each command and analyze individually
    for (const cmd of commands) {
      addTerminalLine("system", `Executing: ${cmd.title || cmd.command}...`);
      const result = await executeCommand(cmd.command);
      results.push(result);
      
      // NEW: Analyze each command result individually
      if (result.ok !== false) {  // Only analyze if command executed (even if it failed)
        setAgentStatus("analyzing");
        addTerminalLine("system", `Analyzing: ${cmd.title || cmd.command}...`);
        
        try {
          const analysisRes = await fetch("/tms/api/agent-copilot/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId,
              mode: "analyze_single",
              commandResults: [result],
              conversationHistory,
              target,
              previousCommand: cmd.command,
              previousReason: cmd.reason,
            }),
          });
          
          const analysisData = await analysisRes.json();
          if (analysisRes.ok && analysisData.answer) {
            // Display AI's conversational analysis
            addTerminalLine("output", `\n[AI Analysis] ${analysisData.answer}`);
            
            // Add to chat messages for user visibility
            const analysisMessage: ChatMessage = {
              id: `analysis_${Date.now()}_${Math.random()}`,
              role: "assistant",
              content: `**Analysis of "${cmd.title || cmd.command}":**\n\n${analysisData.answer}`,
              status: analysisData.status,
              nextStepHint: analysisData.next_step_hint,
              confidence: analysisData.confidence,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, analysisMessage]);
            setConversationHistory((prev) => [...prev, { role: "assistant", content: analysisData.answer }]);
            
            // Auto-continue if AI suggests low-risk next command
            if (analysisData.proposed_commands && analysisData.proposed_commands.length > 0) {
              const nextCmd = analysisData.proposed_commands[0];
              if (nextCmd.risk === "low" && (nextCmd.auto_approve || trustMode)) {
                addTerminalLine("system", `Auto-continuing with: ${nextCmd.title || nextCmd.command}...`);
                // Recursively continue with next command
                await runApprovedCommands([nextCmd], depth + 1);
                return; // Exit early since we're continuing
              }
            }
            
            // If resolved or escalated, stop here
            if (analysisData.status === "resolved" || analysisData.status === "escalate") {
              setAgentStatus("idle");
              if (analysisData.status === "resolved") {
                addTerminalLine("system", "✅ Issue appears to be resolved!");
              } else {
                addTerminalLine("system", "⚠️ Escalation needed - human intervention required.");
              }
              setActiveTab("chat");
              return;
            }
          }
        } catch (e: any) {
          console.error("Single command analysis error:", e);
          // Continue with next command even if analysis fails
        }
      }
    }

    setCommandResults((prev) => [...prev, ...results]);
    setPendingCommands([]);

    // Final analysis of all results (if we didn't auto-continue)
    if (depth === 0 && results.length > 0) {
      setAgentStatus("analyzing");
      addTerminalLine("system", "Final analysis of all results...");

      try {
        const res = await fetch("/tms/api/agent-copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            mode: "analyze",
            commandResults: results,
            conversationHistory,
            target,
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
            await runApprovedCommands(autoApprove, depth + 1);
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
    } else {
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
                  onClick={() => {
                    setTarget("remote");
                    // Reload devices when clicking remote button
                    if (ticketId) {
                      loadRemoteDevices();
                    }
                  }}
                  disabled={!ticketId}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                    target === "remote" 
                      ? "bg-purple-600 text-white" 
                      : !ticketId
                        ? "text-gray-600 cursor-not-allowed"
                        : remoteDevices.length === 0
                          ? "text-yellow-400 hover:text-yellow-300"
                          : "text-gray-400 hover:text-gray-200"
                  }`}
                  title={
                    !ticketId
                      ? "No ticket ID available"
                      : remoteDevices.length === 0
                        ? "No remote devices available. Add a device in the ticket page."
                        : `Remote Customer Device${remoteDevices.length > 0 ? ` (${remoteDevices.length} available)` : ''}`
                  }
                >
                  <Globe className="w-3 h-3" />
                  <span className="hidden sm:inline">Remote</span>
                  {target === "remote" && selectedDeviceId && (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  )}
                  {target === "remote" && remoteDevices.length === 0 && (
                    <WifiOff className="w-3 h-3 text-yellow-400" />
                  )}
                </button>
              </div>
              
              {/* Remote Device Selector */}
              {target === "remote" && (
                <div className="relative">
                  <select
                    value={selectedDeviceId || ""}
                    onChange={(e) => {
                      const newDeviceId = e.target.value;
                      setSelectedDeviceId(newDeviceId || null);
                      console.log('[FloatingCopilot] Device selected:', newDeviceId);
                    }}
                    disabled={isLoadingDevices}
                    className="px-3 py-1 bg-[#1a1b26] border border-gray-700 rounded-lg text-xs text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                  >
                    {isLoadingDevices ? (
                      <option>Loading devices...</option>
                    ) : remoteDevices.length === 0 ? (
                      <option value="">No devices available</option>
                    ) : (
                      <>
                        <option value="">Select device...</option>
                        {remoteDevices.map((device: any) => (
                          <option key={device.device_id} value={device.device_id}>
                            {device.device_name} {device.connected ? "🟢" : "⚪"} ({device.status})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {!isLoadingDevices && remoteDevices.length > 0 && !selectedDeviceId && (
                    <div className="absolute -bottom-5 left-0 text-xs text-yellow-400 whitespace-nowrap">
                      Please select a device
                    </div>
                  )}
                </div>
              )}
              
              {/* Trust Mode Toggle */}
              <button
                onClick={() => setTrustMode(!trustMode)}
                className={`p-2 rounded-lg transition-colors ${trustMode ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-[#414868] text-gray-400"}`}
                title={trustMode ? "Auto-run ON (low-risk)" : "Auto-run OFF"}
              >
                {trustMode ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
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
                        ) : target === "remote" ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded">
                            <Globe className="w-3 h-3" /> Remote Device
                          </span>
                        ) : null}
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
                  <span className={`font-mono text-sm ${
                    target === "remote" ? "text-purple-400" : 
                    "text-emerald-400"
                  }`}>
                    {target === "remote" ? "🌐" : ">"} $
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    disabled={!!currentRunningCommand}
                    placeholder={
                      currentRunningCommand 
                        ? "Running..." 
                        : target === "remote"
                          ? selectedDeviceId
                            ? "Type diagnostic command (e.g., ipconfig, ping google.com)..."
                            : "Select a device first..."
                          : `Type Windows command...`
                    }
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

