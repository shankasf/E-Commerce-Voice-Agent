import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Box, RefreshCw, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { podsApi, namespacesApi } from '@/services/api';
import type { Pod } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function PodsPage() {
  const queryClient = useQueryClient();
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [podToRestart, setPodToRestart] = useState<Pod | null>(null);

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: pods, isLoading: podsLoading, refetch } = useQuery({
    queryKey: ['pods', selectedNamespace],
    queryFn: () => podsApi.list(selectedNamespace),
    enabled: !!selectedNamespace,
  });

  const restartMutation = useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      podsApi.restart(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods', selectedNamespace] });
      setShowRestartConfirm(false);
      setPodToRestart(null);
    },
  });

  const handleRestart = (pod: Pod) => {
    setPodToRestart(pod);
    setShowRestartConfirm(true);
  };

  const confirmRestart = () => {
    if (podToRestart) {
      restartMutation.mutate({
        namespace: podToRestart.namespace,
        name: podToRestart.name,
      });
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'success';
      case 'pending':
      case 'containercreating':
        return 'warning';
      case 'failed':
      case 'error':
      case 'crashloopbackoff':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pods</h1>
          <p className="text-muted-foreground mt-1">Manage pods in your namespaces</p>
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
          {selectedNamespace && (
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {(namespacesLoading || podsLoading) && (
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
            <Box className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a namespace from the dropdown to view pods</p>
          </CardContent>
        </Card>
      )}

      {selectedNamespace && !podsLoading && pods?.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No pods found in the {selectedNamespace} namespace</p>
          </CardContent>
        </Card>
      )}

      {/* Pods List */}
      {pods && pods.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {pods.map((pod) => (
            <motion.div key={pod.name} variants={itemVariants}>
              <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground truncate">{pod.name}</h3>
                        <Badge variant={getStatusVariant(pod.status)} className="flex-shrink-0">{pod.status}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground/70">Phase:</span> {pod.phase}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Restarts:</span> {pod.restarts}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Age:</span> {pod.age}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">IP:</span> {pod.podIP || 'N/A'}
                        </div>
                      </div>
                      {pod.containers && pod.containers.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-muted-foreground/70 uppercase">Containers:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {pod.containers.map((container) => (
                              <Badge
                                key={container.name}
                                variant={container.ready ? 'success' : 'error'}
                                className="text-xs"
                              >
                                {container.name}: {container.state}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPod(pod)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRestart(pod)}
                        disabled={restartMutation.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pod Details Dialog */}
      <Dialog open={!!selectedPod} onOpenChange={() => setSelectedPod(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPod?.name}</DialogTitle>
          </DialogHeader>
          {selectedPod && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Namespace</span>
                  <p className="font-medium text-foreground">{selectedPod.namespace}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-medium text-foreground">{selectedPod.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Node</span>
                  <p className="font-medium text-foreground">{selectedPod.nodeName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Pod IP</span>
                  <p className="font-medium text-foreground">{selectedPod.podIP || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created</span>
                  <p className="font-medium text-foreground">
                    {new Date(selectedPod.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Age</span>
                  <p className="font-medium text-foreground">{selectedPod.age}</p>
                </div>
              </div>

              {selectedPod.labels && Object.keys(selectedPod.labels).length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Labels</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(selectedPod.labels).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPod.containers && selectedPod.containers.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Containers</span>
                  <div className="mt-2 space-y-2">
                    {selectedPod.containers.map((container) => (
                      <Card key={container.name} className="bg-card/30 border-border/50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{container.name}</span>
                            <Badge variant={container.ready ? 'success' : 'error'}>
                              {container.state}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <p>Image: {container.image}</p>
                            <p>Restarts: {container.restartCount}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation */}
      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Pod</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restart pod "{podToRestart?.name}"? The pod will be deleted and recreated by its controller.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPodToRestart(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={restartMutation.isPending}
            >
              {restartMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restarting...
                </>
              ) : (
                'Restart'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
