import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Eye, Scale, RotateCcw, Loader2, Minus, Plus } from 'lucide-react';
import { deploymentsApi, namespacesApi } from '@/services/api';
import type { Deployment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
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

export default function DeploymentsPage() {
  const queryClient = useQueryClient();
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [deploymentToAction, setDeploymentToAction] = useState<Deployment | null>(null);
  const [newReplicas, setNewReplicas] = useState(1);

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: deployments, isLoading: deploymentsLoading, refetch } = useQuery({
    queryKey: ['deployments', selectedNamespace],
    queryFn: () => deploymentsApi.list(selectedNamespace),
    enabled: !!selectedNamespace,
  });

  const scaleMutation = useMutation({
    mutationFn: ({ namespace, name, replicas }: { namespace: string; name: string; replicas: number }) =>
      deploymentsApi.scale(namespace, name, replicas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments', selectedNamespace] });
      setShowScaleModal(false);
      setDeploymentToAction(null);
    },
  });

  const restartMutation = useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      deploymentsApi.restart(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments', selectedNamespace] });
      setShowRestartConfirm(false);
      setDeploymentToAction(null);
    },
  });

  const handleScale = (deployment: Deployment) => {
    setDeploymentToAction(deployment);
    setNewReplicas(deployment.replicas);
    setShowScaleModal(true);
  };

  const handleRestart = (deployment: Deployment) => {
    setDeploymentToAction(deployment);
    setShowRestartConfirm(true);
  };

  const confirmScale = () => {
    if (deploymentToAction) {
      scaleMutation.mutate({
        namespace: deploymentToAction.namespace,
        name: deploymentToAction.name,
        replicas: newReplicas,
      });
    }
  };

  const confirmRestart = () => {
    if (deploymentToAction) {
      restartMutation.mutate({
        namespace: deploymentToAction.namespace,
        name: deploymentToAction.name,
      });
    }
  };

  const getHealthStatus = (deployment: Deployment): 'success' | 'warning' | 'error' => {
    if (deployment.readyReplicas === deployment.replicas && deployment.replicas > 0) {
      return 'success';
    }
    if (deployment.readyReplicas > 0) {
      return 'warning';
    }
    if (deployment.replicas === 0) {
      return 'warning';
    }
    return 'error';
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
          <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground mt-1">Scale and manage deployments</p>
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
      {(namespacesLoading || deploymentsLoading) && (
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
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a namespace from the dropdown to view deployments</p>
          </CardContent>
        </Card>
      )}

      {selectedNamespace && !deploymentsLoading && deployments?.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No deployments found in the {selectedNamespace} namespace</p>
          </CardContent>
        </Card>
      )}

      {/* Deployments List */}
      {deployments && deployments.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {deployments.map((deployment) => (
            <motion.div key={deployment.name} variants={itemVariants}>
              <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground truncate">{deployment.name}</h3>
                        <Badge variant={getHealthStatus(deployment)} className="flex-shrink-0">
                          {deployment.readyReplicas}/{deployment.replicas} Ready
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground/70">Strategy:</span> {deployment.strategy}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Available:</span> {deployment.availableReplicas}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Updated:</span> {deployment.updatedReplicas}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Age:</span> {deployment.age}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground truncate">
                        <span className="text-muted-foreground/70">Image:</span> {deployment.image}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDeployment(deployment)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleScale(deployment)}
                        disabled={scaleMutation.isPending}
                      >
                        <Scale className="w-4 h-4 mr-1" />
                        Scale
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestart(deployment)}
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

      {/* Deployment Details Dialog */}
      <Dialog open={!!selectedDeployment} onOpenChange={() => setSelectedDeployment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDeployment?.name}</DialogTitle>
          </DialogHeader>
          {selectedDeployment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Namespace</span>
                  <p className="font-medium text-foreground">{selectedDeployment.namespace}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Strategy</span>
                  <p className="font-medium text-foreground">{selectedDeployment.strategy}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Replicas</span>
                  <p className="font-medium text-foreground">{selectedDeployment.replicas}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Ready</span>
                  <p className="font-medium text-foreground">{selectedDeployment.readyReplicas}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Available</span>
                  <p className="font-medium text-foreground">{selectedDeployment.availableReplicas}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <p className="font-medium text-foreground">{selectedDeployment.updatedReplicas}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created</span>
                  <p className="font-medium text-foreground">
                    {new Date(selectedDeployment.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Age</span>
                  <p className="font-medium text-foreground">{selectedDeployment.age}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Image</span>
                <p className="font-medium text-sm text-foreground break-all">{selectedDeployment.image}</p>
              </div>

              {selectedDeployment.labels && Object.keys(selectedDeployment.labels).length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Labels</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(selectedDeployment.labels).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scale Modal */}
      <Dialog open={showScaleModal} onOpenChange={setShowScaleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scale Deployment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              Scale <span className="font-semibold text-foreground">{deploymentToAction?.name}</span> to a new replica count.
            </p>
            <div className="space-y-4">
              <Label>Replicas</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewReplicas(Math.max(0, newReplicas - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={newReplicas}
                  onChange={(e) => setNewReplicas(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-center text-2xl font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewReplicas(newReplicas + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {deploymentToAction?.replicas} replicas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScaleModal(false);
                setDeploymentToAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmScale}
              disabled={scaleMutation.isPending || newReplicas === deploymentToAction?.replicas}
            >
              {scaleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scaling...
                </>
              ) : (
                'Scale'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation */}
      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restart deployment "{deploymentToAction?.name}"? This will trigger a rolling restart of all pods.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeploymentToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestart}
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
