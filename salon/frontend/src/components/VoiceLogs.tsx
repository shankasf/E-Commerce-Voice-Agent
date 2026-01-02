/**
 * Voice Agent Realtime Logs Component
 * 
 * Displays realtime transcripts, function calls, and errors
 * from the voice agent conversation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare,
    Wrench,
    AlertCircle,
    Wifi,
    WifiOff,
    ChevronDown,
    ChevronUp,
    Trash2,
    Download,
    Filter,
    Phone,
    PhoneOff
} from 'lucide-react';

interface LogEntry {
    id: string;
    type: 'transcript' | 'function_call' | 'error' | 'session_start' | 'session_end' | 'ping' | 'connected';
    timestamp: string;
    session_id?: string;
    role?: 'user' | 'assistant';
    text?: string;
    is_final?: boolean;
    function_name?: string;
    arguments?: Record<string, any>;
    result?: any;
    error?: string;
    details?: Record<string, any>;
    data?: Record<string, any>;
}

interface VoiceLogsProps {
    apiEndpoint?: string;
    maxLogs?: number;
    autoScroll?: boolean;
    className?: string;
}

type FilterType = 'all' | 'transcript' | 'function_call' | 'error';

export const VoiceLogs: React.FC<VoiceLogsProps> = ({
    apiEndpoint = '',
    maxLogs = 500,
    autoScroll = true,
    className = '',
}) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoScroll && isExpanded) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll, isExpanded]);

    // Connect to SSE stream
    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource(`${apiEndpoint}/api/voice/logs/stream`);
        eventSourceRef.current = es;

        es.onopen = () => {
            setIsConnected(true);
            console.log('Connected to voice logs stream');
        };

        es.onmessage = (event) => {
            try {
                const data: LogEntry = JSON.parse(event.data);

                // Skip ping events from display
                if (data.type === 'ping') {
                    return;
                }

                // Add unique ID if not present
                const entry: LogEntry = {
                    ...data,
                    id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                };

                setLogs(prev => {
                    const newLogs = [...prev, entry];
                    if (newLogs.length > maxLogs) {
                        return newLogs.slice(-maxLogs);
                    }
                    return newLogs;
                });
            } catch (err) {
                console.error('Failed to parse log event:', err);
            }
        };

        es.onerror = () => {
            setIsConnected(false);
            es.close();

            // Reconnect after delay
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('Reconnecting to voice logs stream...');
                connect();
            }, 3000);
        };
    }, [apiEndpoint, maxLogs]);

    // Initial connection
    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.type === filter;
    });

    // Toggle entry expansion
    const toggleExpand = (id: string) => {
        setExpandedEntries(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Clear logs
    const clearLogs = () => {
        setLogs([]);
    };

    // Export logs
    const exportLogs = () => {
        const data = JSON.stringify(logs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Format timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Render log entry
    const renderLogEntry = (log: LogEntry) => {
        const isEntryExpanded = expandedEntries.has(log.id);

        switch (log.type) {
            case 'transcript':
                return (
                    <div
                        key={log.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${log.role === 'user'
                                ? 'bg-blue-50 border-l-4 border-blue-400'
                                : 'bg-purple-50 border-l-4 border-purple-400'
                            }`}
                    >
                        <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${log.role === 'user' ? 'text-blue-500' : 'text-purple-500'
                            }`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <span className="font-semibold uppercase">
                                    {log.role === 'user' ? '👤 User' : '🤖 Agent'}
                                </span>
                                <span>{formatTime(log.timestamp)}</span>
                                {!log.is_final && (
                                    <span className="text-orange-500 text-xs">(partial)</span>
                                )}
                            </div>
                            <p className="text-gray-800 text-sm break-words">{log.text}</p>
                        </div>
                    </div>
                );

            case 'function_call':
                return (
                    <div
                        key={log.id}
                        className={`p-3 rounded-lg bg-amber-50 border-l-4 ${log.error ? 'border-red-400' : 'border-amber-400'
                            }`}
                    >
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleExpand(log.id)}
                        >
                            <Wrench className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="font-mono text-sm font-semibold text-amber-800">
                                {log.function_name}()
                            </span>
                            <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                            {log.error && (
                                <span className="text-xs text-red-500 font-medium">FAILED</span>
                            )}
                            {isEntryExpanded ? (
                                <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                            )}
                        </div>
                        {isEntryExpanded && (
                            <div className="mt-2 space-y-2">
                                <div>
                                    <span className="text-xs font-medium text-gray-500">Arguments:</span>
                                    <pre className="mt-1 p-2 bg-gray-800 text-green-400 text-xs rounded overflow-x-auto">
                                        {JSON.stringify(log.arguments, null, 2)}
                                    </pre>
                                </div>
                                {log.result !== undefined && log.result !== null && (
                                    <div>
                                        <span className="text-xs font-medium text-gray-500">Result:</span>
                                        <pre className="mt-1 p-2 bg-gray-800 text-cyan-400 text-xs rounded overflow-x-auto">
                                            {JSON.stringify(log.result, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {log.error && (
                                    <div>
                                        <span className="text-xs font-medium text-red-500">Error:</span>
                                        <pre className="mt-1 p-2 bg-red-900 text-red-200 text-xs rounded overflow-x-auto">
                                            {log.error}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'error':
                return (
                    <div
                        key={log.id}
                        className="p-3 rounded-lg bg-red-50 border-l-4 border-red-400"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-700">Error</span>
                            <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                        </div>
                        <p className="mt-1 text-sm text-red-600">{log.error}</p>
                        {log.details && Object.keys(log.details).length > 0 && (
                            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        )}
                    </div>
                );

            case 'session_start':
                return (
                    <div
                        key={log.id}
                        className="p-3 rounded-lg bg-green-50 border-l-4 border-green-400"
                    >
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-green-700">Session Started</span>
                            <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 font-mono">
                            Session: {log.session_id?.slice(0, 8)}...
                        </p>
                    </div>
                );

            case 'session_end':
                return (
                    <div
                        key={log.id}
                        className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400"
                    >
                        <div className="flex items-center gap-2">
                            <PhoneOff className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700">Session Ended</span>
                            <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                        </div>
                    </div>
                );

            case 'connected':
                return (
                    <div
                        key={log.id}
                        className="p-2 rounded-lg bg-blue-50 text-center"
                    >
                        <span className="text-xs text-blue-600">
                            🔗 Connected to log stream at {formatTime(log.timestamp)}
                        </span>
                    </div>
                );

            default:
                return (
                    <div
                        key={log.id}
                        className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300"
                    >
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium">{log.type}</span>
                            <span>{formatTime(log.timestamp)}</span>
                        </div>
                        {log.data && (
                            <pre className="mt-1 text-xs text-gray-600 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                );
        }
    };

    // Count by type
    const transcriptCount = logs.filter(l => l.type === 'transcript').length;
    const functionCount = logs.filter(l => l.type === 'function_call').length;
    const errorCount = logs.filter(l => l.type === 'error').length;

    return (
        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800">Voice Agent Logs</h3>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${isConnected
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {isConnected ? (
                            <>
                                <Wifi className="w-3 h-3" />
                                <span>Live</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                <span>Disconnected</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportLogs}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        title="Export logs"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Clear logs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {/* Filters */}
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-2 py-1 text-xs rounded ${filter === 'all'
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                All ({logs.length})
                            </button>
                            <button
                                onClick={() => setFilter('transcript')}
                                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filter === 'transcript'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                <MessageSquare className="w-3 h-3" />
                                Transcripts ({transcriptCount})
                            </button>
                            <button
                                onClick={() => setFilter('function_call')}
                                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filter === 'function_call'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                <Wrench className="w-3 h-3" />
                                Functions ({functionCount})
                            </button>
                            <button
                                onClick={() => setFilter('error')}
                                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filter === 'error'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                <AlertCircle className="w-3 h-3" />
                                Errors ({errorCount})
                            </button>
                        </div>
                    </div>

                    {/* Log entries */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[500px]">
                        {filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                                <MessageSquare className="w-8 h-8 mb-2" />
                                <p className="text-sm">No logs yet</p>
                                <p className="text-xs">Start a voice conversation to see realtime logs</p>
                            </div>
                        ) : (
                            filteredLogs.map(renderLogEntry)
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceLogs;
