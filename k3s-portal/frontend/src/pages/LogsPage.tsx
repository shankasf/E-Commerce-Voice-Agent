import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, Loader2, Play, Square, Trash2 } from 'lucide-react';
import { namespacesApi, podsApi } from '@/services/api';
import { websocketService } from '@/services/websocket';
import type { Pod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface LogLine {
  timestamp: string;
  line: string;
  streamId: string;
}

export default function LogsPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: pods, isLoading: podsLoading } = useQuery({
    queryKey: ['pods', selectedNamespace],
    queryFn: () => podsApi.list(selectedNamespace),
    enabled: !!selectedNamespace,
  });

  const scrollToBottom = useCallback(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  useEffect(() => {
    websocketService.connect();

    return () => {
      if (streamId) {
        websocketService.unsubscribeFromLogs(streamId);
      }
    };
  }, [streamId]);

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const startStreaming = () => {
    if (!selectedPod) return;

    setLogs([]);
    setIsStreaming(true);

    const newStreamId = websocketService.subscribeToLogs(
      selectedNamespace,
      selectedPod.name,
      selectedContainer || undefined,
      (logLine) => {
        setLogs((prev) => [...prev, logLine].slice(-5000));
      },
      (error) => {
        console.error('Log stream error:', error);
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
      }
    );

    setStreamId(newStreamId);
  };

  const stopStreaming = () => {
    if (streamId) {
      websocketService.unsubscribeFromLogs(streamId);
      setStreamId(null);
    }
    setIsStreaming(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handlePodSelect = (pod: Pod) => {
    if (isStreaming) {
      stopStreaming();
    }
    setSelectedPod(pod);
    setSelectedContainer(pod.containers?.[0]?.name || '');
    setLogs([]);
  };

  const filteredLogs = filter
    ? logs.filter((log) => log.line.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const formatLogLine = (line: string) => {
    if (line.includes('ERROR') || line.includes('error')) {
      return 'text-red-400';
    }
    if (line.includes('WARN') || line.includes('warning')) {
      return 'text-yellow-400';
    }
    if (line.includes('INFO') || line.includes('info')) {
      return 'text-blue-400';
    }
    if (line.includes('DEBUG') || line.includes('debug')) {
      return 'text-muted-foreground/50';
    }
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-8rem)] flex flex-col space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground mt-1">Stream real-time pod logs</p>
        </div>
        <Select
          value={selectedNamespace}
          onValueChange={(value) => {
            setSelectedNamespace(value);
            setSelectedPod(null);
            setLogs([]);
            if (isStreaming) stopStreaming();
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Namespace" />
          </SelectTrigger>
          <SelectContent>
            {namespaces?.map((ns) => (
              <SelectItem key={ns.name} value={ns.name}>
                {ns.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Pod List Sidebar */}
        <Card className="w-64 flex-shrink-0 bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pods</CardTitle>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto max-h-[calc(100%-4rem)]">
            {namespacesLoading || podsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !selectedNamespace ? (
              <p className="text-sm text-muted-foreground px-2">Select a namespace</p>
            ) : pods?.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No pods found</p>
            ) : (
              <div className="space-y-1">
                {pods?.map((pod) => (
                  <button
                    key={pod.name}
                    onClick={() => handlePodSelect(pod)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedPod?.name === pod.name
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <div className="font-medium truncate">{pod.name}</div>
                    <div className="text-xs text-muted-foreground">{pod.status}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedPod ? (
            <Card className="flex-1 bg-card/50 border-border/50 flex items-center justify-center">
              <CardContent className="text-center">
                <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a pod from the sidebar to view logs</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Controls */}
              <Card className="bg-card/50 border-border/50 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {selectedPod.containers && selectedPod.containers.length > 1 && (
                        <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPod.containers.map((container) => (
                              <SelectItem key={container.name} value={container.name}>
                                {container.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        type="text"
                        placeholder="Filter logs..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="flex-1 max-w-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={autoScroll}
                          onChange={(e) => setAutoScroll(e.target.checked)}
                          className="rounded bg-background border-border"
                        />
                        Auto-scroll
                      </label>
                      <Button variant="outline" size="sm" onClick={clearLogs}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                      {isStreaming ? (
                        <Button variant="destructive" size="sm" onClick={stopStreaming}>
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={startStreaming}>
                          <Play className="w-4 h-4 mr-1" />
                          Start Stream
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Log Output */}
              <Card
                className="flex-1 bg-background border-border overflow-hidden"
              >
                <div
                  ref={logsContainerRef}
                  onScroll={handleScroll}
                  className="h-full p-4 overflow-y-auto font-mono text-sm"
                >
                  {filteredLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      {isStreaming ? 'Waiting for logs...' : 'Click "Start Stream" to view logs'}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredLogs.map((log, index) => (
                        <div key={index} className="flex">
                          <span className="text-muted-foreground/50 mr-3 select-none">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={formatLogLine(log.line)}>{log.line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </Card>

              {/* Status Bar */}
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {isStreaming ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Streaming...
                    </span>
                  ) : (
                    'Disconnected'
                  )}
                </span>
                <span>
                  {filteredLogs.length} lines
                  {filter && ` (filtered from ${logs.length})`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
