"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Terminal, X, Maximize2, Minimize2, Copy, Check, Loader2 } from "lucide-react";

export type TerminalLine = {
  id: string;
  type: "command" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
};

type TerminalPanelProps = {
  ticketId: string;
  lines: TerminalLine[];
  onRunCommand: (command: string) => Promise<void>;
  isRunning: boolean;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export default function TerminalPanel({
  ticketId,
  lines,
  onRunCommand,
  isRunning,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: TerminalPanelProps) {
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when terminal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && input.trim() && !isRunning) {
        const cmd = input.trim();
        setCommandHistory((prev) => [...prev.filter((c) => c !== cmd), cmd]);
        setHistoryIndex(-1);
        onRunCommand(cmd);
        setInput("");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
        } else {
          setHistoryIndex(-1);
          setInput("");
        }
      } else if (e.key === "c" && e.ctrlKey) {
        // Ctrl+C to cancel (visual only for now)
        if (isRunning) {
          setInput("");
        }
      }
    },
    [input, isRunning, commandHistory, historyIndex, onRunCommand]
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "text-emerald-400";
      case "error":
        return "text-red-400";
      case "system":
        return "text-yellow-400";
      default:
        return "text-gray-300";
    }
  };

  const getLinePrefix = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "$ ";
      case "error":
        return "✗ ";
      case "system":
        return "→ ";
      default:
        return "";
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden ${
        isExpanded ? "fixed inset-4 z-50" : "h-full"
      }`}
      style={{ minHeight: isExpanded ? undefined : 300 }}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Terminal</span>
          <span className="text-xs text-gray-500">— Ticket #{ticketId}</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-[#30363d] rounded text-gray-400 hover:text-gray-200"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#30363d] rounded text-gray-400 hover:text-gray-200"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-auto p-3 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 && (
          <div className="text-gray-500 text-sm">
            <p className="mb-2">Welcome to AI Agent Terminal</p>
            <p className="text-xs">
              Type a command or let the AI suggest commands to run.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Allowed: ipconfig, ping, nslookup, tracert, netstat, systeminfo, tasklist...
            </p>
          </div>
        )}

        {lines.map((line) => (
          <div
            key={line.id}
            className={`group flex items-start gap-2 ${
              line.type === "command" ? "mt-3 first:mt-0" : ""
            }`}
          >
            <div className={`flex-1 ${getLineColor(line.type)}`}>
              <span className="select-none opacity-60">{getLinePrefix(line.type)}</span>
              <span className="whitespace-pre-wrap break-all">{line.content}</span>
            </div>
            {line.type === "command" && (
              <button
                onClick={() => copyToClipboard(line.content, line.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#30363d] rounded text-gray-500 hover:text-gray-300 transition-opacity"
                title="Copy command"
              >
                {copiedId === line.id ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ))}

        {/* Running indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 mt-2 text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Executing command...</span>
          </div>
        )}
      </div>

      {/* Terminal Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-t border-[#30363d]">
        <span className="text-emerald-400 font-mono text-sm select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? "Running..." : "Type command or press ↑ for history"}
          className="flex-1 bg-transparent text-gray-200 font-mono text-sm outline-none placeholder:text-gray-600 disabled:opacity-50"
        />
        {input && !isRunning && (
          <span className="text-xs text-gray-500">Press Enter to run</span>
        )}
      </div>
    </div>
  );
}

