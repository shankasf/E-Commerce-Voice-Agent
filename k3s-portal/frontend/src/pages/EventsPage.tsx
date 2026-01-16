import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { namespacesApi, api } from '@/services/api';
import type { Event } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function EventsPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: events, isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ['events', selectedNamespace],
    queryFn: async () => {
      const response = await api.get<Event[]>(`/kubernetes/namespaces/${selectedNamespace}/events`);
      return response.data;
    },
    enabled: !!selectedNamespace,
    refetchInterval: 30000,
  });

  const filteredEvents = events?.filter((event) => {
    if (typeFilter === 'all') return true;
    return event.type.toLowerCase() === typeFilter.toLowerCase();
  });

  const getEventTypeVariant = (type: string): 'success' | 'warning' | 'default' => {
    switch (type.toLowerCase()) {
      case 'normal':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (date?: string): string => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Monitor cluster events</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          {selectedNamespace && (
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {(namespacesLoading || eventsLoading) && (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
      )}

      {/* Empty States */}
      {!selectedNamespace && !namespacesLoading && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a namespace from the dropdown to view events</p>
          </CardContent>
        </Card>
      )}

      {selectedNamespace && !eventsLoading && filteredEvents?.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No {typeFilter !== 'all' ? typeFilter : ''} events found in the {selectedNamespace} namespace
            </p>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {filteredEvents && filteredEvents.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredEvents.map((event, index) => (
            <motion.div key={`${event.name}-${index}`} variants={itemVariants}>
              <Card className="bg-card/50 border-border/50 hover:bg-card/80 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Badge variant={getEventTypeVariant(event.type)} className="shrink-0">
                      {event.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{event.reason}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm text-muted-foreground">
                          {event.involvedObject.kind}: {event.involvedObject.name}
                        </span>
                      </div>
                      <p className="mt-1 text-foreground/80">{event.message}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Count: {event.count}</span>
                        <span>First: {formatTimeAgo(event.firstTimestamp)}</span>
                        <span>Last: {formatTimeAgo(event.lastTimestamp)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Event Stats */}
      {events && events.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Event Statistics</span>
                <div className="mt-1 flex items-center gap-4">
                  <span className="text-sm text-foreground">
                    <span className="font-medium text-green-400">
                      {events.filter((e) => e.type === 'Normal').length}
                    </span>{' '}
                    Normal
                  </span>
                  <span className="text-sm text-foreground">
                    <span className="font-medium text-yellow-400">
                      {events.filter((e) => e.type === 'Warning').length}
                    </span>{' '}
                    Warning
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredEvents?.length || 0} of {events.length} events
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
