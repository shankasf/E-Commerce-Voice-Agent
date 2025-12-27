"use client";

import React, { useMemo, useState, useCallback } from "react";
import { MessageSquare, Terminal, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, Play } from "lucide-react";
import TerminalPanel, { TerminalLine } from "./TerminalPanel";

type ProposedCommand = {
  title: string;
  command: string;
  reason?: string;
  risk?: "low" | "medium" | "high";
};

export default function AgentCopilotPanel({
  ticketId,
}: {
  ticketId: string;
}) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [commands, setCommands] = useState<ProposedCommand[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  
  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !loadingChat, [input, loadingChat]);

  const addTerminalLine = useCallback((type: TerminalLine["type"], content: string) => {
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  async function sendMessage() {
    if (!canSend) return;
    setLoadingChat(true);
    setAnswer("");
    setCommands([]);

    try {
      const res = await fetch("/tms/api/agent-copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: input.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Chat failed");

      setAnswer(data.answer ?? "");
      const proposedCommands = Array.isArray(data.proposed_commands) ? data.proposed_commands : [];
      setCommands(proposedCommands);
      
      // Auto-open terminal if commands are proposed
      if (proposedCommands.length > 0) {
        setShowTerminal(true);
        addTerminalLine("system", `AI suggested ${proposedCommands.length} command(s) for troubleshooting`);
      }
    } catch (e: any) {
      setAnswer(`Error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setLoadingChat(false);
    }
  }

  const runCommand = useCallback(async (command: string) => {
    setRunning(command);
    setShowTerminal(true);
    addTerminalLine("command", command);

    try {
      const res = await fetch("/tms/api/agent-copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, command }),
      });

      const data = await res.json();
      const toolResult = data?.result?.content?.[0]?.text
        ? JSON.parse(data.result.content[0].text)
        : data?.result?.content?.[0] ?? data?.result ?? data;

      // Normalize result
      const normalized =
        toolResult?.ok !== undefined
          ? toolResult
          : toolResult?.data?.ok !== undefined
            ? toolResult.data
            : { ok: false, reason: "Unexpected MCP response format" };

      if (normalized.ok) {
        if (normalized.stdout) {
          addTerminalLine("output", normalized.stdout);
        }
        if (normalized.stderr) {
          addTerminalLine("error", `[stderr] ${normalized.stderr}`);
        }
        if (!normalized.stdout && !normalized.stderr) {
          addTerminalLine("output", "Command completed successfully (no output)");
        }
      } else {
        addTerminalLine("error", normalized.reason ?? "Command failed");
      }
    } catch (e: any) {
      addTerminalLine("error", e?.message ?? "Execute failed");
    } finally {
      setRunning(null);
    }
  }, [ticketId, addTerminalLine]);

  const handleTerminalCommand = useCallback(async (command: string) => {
    await runCommand(command);
  }, [runCommand]);

  const getRiskIcon = (risk?: "low" | "medium" | "high") => {
    switch (risk) {
      case "high":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      case "medium":
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    }
  };

  const getRiskColor = (risk?: "low" | "medium" | "high") => {
    switch (risk) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-green-200 bg-green-50";
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-semibold text-gray-800">AI Copilot</span>
        </div>
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showTerminal
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Terminal className="w-4 h-4" />
          {showTerminal ? "Hide Terminal" : "Open Terminal"}
        </button>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className={`flex ${showTerminal ? "divide-x divide-gray-200" : ""}`}>
        {/* Left: Chat Panel */}
        <div className={`${showTerminal ? "w-1/2" : "w-full"} p-4`}>
          {/* Input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about the ticket... e.g., 'how to fix network issue?'"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!canSend}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingChat ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Thinking
                </span>
              ) : (
                "Ask AI"
              )}
            </button>
          </div>

          {/* Answer */}
          {answer && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">AI Response</span>
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {answer}
              </div>
            </div>
          )}

          {/* Proposed Commands */}
          {commands.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Suggested Commands
                </span>
                <span className="text-xs text-gray-400">
                  (click to run in terminal)
                </span>
              </div>
              <div className="space-y-2">
                {commands.map((cmd, idx) => {
                  const isThisRunning = running === cmd.command;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 transition-all ${getRiskColor(cmd.risk)} ${
                        isThisRunning ? "ring-2 ring-indigo-400" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getRiskIcon(cmd.risk)}
                            <span className="font-medium text-sm text-gray-800">
                              {cmd.title}
                            </span>
                          </div>
                          {cmd.reason && (
                            <p className="text-xs text-gray-500 mb-2">{cmd.reason}</p>
                          )}
                          <code className="block text-xs bg-gray-800 text-gray-200 px-3 py-2 rounded font-mono overflow-x-auto">
                            {cmd.command}
                          </code>
                        </div>
                        <button
                          onClick={() => runCommand(cmd.command)}
                          disabled={!!running}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isThisRunning
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          }`}
                        >
                          {isThisRunning ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Running
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              Run
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!answer && commands.length === 0 && !loadingChat && (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask the AI about this ticket for troubleshooting help</p>
            </div>
          )}
        </div>

        {/* Right: Terminal Panel */}
        {showTerminal && (
          <div className="w-1/2 p-4">
            <TerminalPanel
              ticketId={ticketId}
              lines={terminalLines}
              onRunCommand={handleTerminalCommand}
              isRunning={!!running}
              onClose={() => setShowTerminal(false)}
              isExpanded={terminalExpanded}
              onToggleExpand={() => setTerminalExpanded(!terminalExpanded)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
