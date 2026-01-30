'use client';

import { useState } from 'react';
import { IssueSummary } from '@/types/deviceChat';
import {
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  MessageSquare,
  Lightbulb,
  Ticket,
  AlertCircle,
} from 'lucide-react';

interface IssueSummaryCardProps {
  summary: IssueSummary;
}

export default function IssueSummaryCard({ summary }: IssueSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      awaiting_user_response: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Response' },
      awaiting_command_result: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Running Command' },
      error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  // Get action type icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'question':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'command':
        return <Terminal className="w-4 h-4 text-purple-500" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'analysis':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get command status icon
  const getCommandStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const statusBadge = getStatusBadge(summary.current_status);
  const visibleSteps = showAllSteps
    ? summary.troubleshooting_steps
    : summary.troubleshooting_steps.slice(0, 5);

  return (
    <div className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-blue-900">Issue Summary</span>
          <span className={`px-2 py-1 text-xs rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
        </div>
        <button className="text-blue-600 hover:text-blue-800">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Customer & Device Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium">{summary.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Org:</span>
              <span className="font-medium">{summary.organization_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Device:</span>
              <span className="font-medium">{summary.device_info}</span>
            </div>
          </div>

          {/* Ticket Info (if available) */}
          {summary.ticket_subject && (
            <div className="flex items-center gap-4 text-sm bg-blue-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Ticket #{summary.ticket_id}:</span>
                <span className="font-medium text-blue-800">{summary.ticket_subject}</span>
              </div>
              {summary.ticket_priority && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                    {summary.ticket_priority}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Issue Description */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Problem Reported</h4>
            <p className="text-sm text-gray-600">{summary.issue_description || 'No description available'}</p>
          </div>

          {/* Troubleshooting Steps */}
          {summary.troubleshooting_steps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Steps Taken ({summary.troubleshooting_steps.length})
              </h4>
              <div className="space-y-2">
                {visibleSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="flex items-center gap-1 min-w-[24px]">
                      <span className="text-gray-400 text-xs">{step.step_number}.</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {getActionIcon(step.action_type)}
                        <span className="text-gray-700">{step.description}</span>
                      </div>
                      {step.outcome && (
                        <div className="ml-6 mt-1 text-xs text-gray-500 italic">
                          Response: {step.outcome}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {summary.troubleshooting_steps.length > 5 && (
                <button
                  onClick={() => setShowAllSteps(!showAllSteps)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  {showAllSteps
                    ? 'Show less'
                    : `Show ${summary.troubleshooting_steps.length - 5} more steps`}
                </button>
              )}
            </div>
          )}

          {/* Commands Executed */}
          {summary.commands_executed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Commands Executed ({summary.commands_executed.length})
              </h4>
              <div className="space-y-2">
                {summary.commands_executed.map((cmd, idx) => (
                  <div key={idx} className="bg-gray-900 rounded p-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400">$ {cmd.command}</span>
                      <div className="flex items-center gap-1">
                        {getCommandStatusIcon(cmd.status)}
                        <span
                          className={
                            cmd.status === 'success'
                              ? 'text-green-400'
                              : cmd.status === 'error'
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }
                        >
                          {cmd.status}
                        </span>
                      </div>
                    </div>
                    {cmd.description && (
                      <div className="text-gray-500 mt-1">{cmd.description}</div>
                    )}
                    {cmd.output_preview && (
                      <div className="text-gray-300 mt-1 whitespace-pre-wrap">
                        {cmd.output_preview}
                      </div>
                    )}
                    {cmd.error && <div className="text-red-400 mt-1">{cmd.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Diagnosis */}
          {summary.ai_diagnosis && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                AI Assessment
              </h4>
              <p className="text-sm text-amber-900">{summary.ai_diagnosis}</p>
            </div>
          )}

          {/* Generated timestamp */}
          <div className="text-xs text-gray-400 text-right">
            Summary generated: {new Date(summary.generated_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
