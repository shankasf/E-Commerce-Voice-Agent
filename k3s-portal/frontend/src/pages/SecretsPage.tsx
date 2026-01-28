import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Key, RefreshCw, Loader2, Edit, ArrowLeft, Plus, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { secretsApi, namespacesApi } from '@/services/api';
import type { Secret } from '@/types';
import { useAuth } from '@/context/AuthContext';
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

export default function SecretsPage() {
  const queryClient = useQueryClient();
  const { canManageSecrets } = useAuth();
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Set<string>>(new Set());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: secrets, isLoading: secretsLoading, refetch } = useQuery({
    queryKey: ['secrets', selectedNamespace],
    queryFn: () => secretsApi.list(selectedNamespace),
    enabled: !!selectedNamespace && canManageSecrets(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ namespace, name, data }: { namespace: string; name: string; data: Record<string, string> }) =>
      secretsApi.update(namespace, name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', selectedNamespace] });
      setShowSaveConfirm(false);
      setEditMode(false);
      if (selectedSecret) {
        setSelectedSecret({ ...selectedSecret, data: editedData });
      }
    },
  });

  const handleEdit = (secret: Secret) => {
    setSelectedSecret(secret);
    setEditedData({ ...secret.data });
    setEditMode(true);
    setShowValues(new Set());
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    if (selectedSecret) {
      updateMutation.mutate({
        namespace: selectedSecret.namespace,
        name: selectedSecret.name,
        data: editedData,
      });
    }
  };

  const toggleShowValue = (key: string) => {
    const newShowValues = new Set(showValues);
    if (newShowValues.has(key)) {
      newShowValues.delete(key);
    } else {
      newShowValues.add(key);
    }
    setShowValues(newShowValues);
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  const addNewKey = () => {
    const newKey = `NEW_KEY_${Object.keys(editedData).length + 1}`;
    setEditedData((prev) => ({ ...prev, [newKey]: '' }));
  };

  const removeKey = (key: string) => {
    setEditedData((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  if (!canManageSecrets()) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Secrets</h1>
          <p className="text-muted-foreground mt-1">Manage Kubernetes secrets</p>
        </div>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">You need admin privileges to view and manage secrets</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Secrets</h1>
          <p className="text-muted-foreground mt-1">Manage Kubernetes secrets</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedNamespace}
            onValueChange={(value) => {
              setSelectedNamespace(value);
              setSelectedSecret(null);
              setEditMode(false);
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
          {selectedNamespace && (
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="bg-yellow-500/10 border-yellow-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Warning: Handle secrets with care. Changes are applied immediately to the cluster.</span>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {(namespacesLoading || secretsLoading) && (
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
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a namespace from the dropdown to view secrets</p>
          </CardContent>
        </Card>
      )}

      {selectedNamespace && !secretsLoading && secrets?.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No secrets found in the {selectedNamespace} namespace</p>
          </CardContent>
        </Card>
      )}

      {/* Secrets List */}
      {secrets && secrets.length > 0 && !selectedSecret && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {secrets.map((secret) => (
            <motion.div key={secret.name} variants={itemVariants}>
              <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{secret.name}</h3>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/70">Type:</span> {secret.type}
                        <span className="mx-2">|</span>
                        <span className="text-muted-foreground/70">Keys:</span> {Object.keys(secret.data).length}
                      </div>
                    </div>
                    <Button variant="default" size="sm" onClick={() => handleEdit(secret)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Secret Editor */}
      {selectedSecret && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedSecret.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Type: {selectedSecret.type}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSecret(null);
                  setEditMode(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {editMode && (
                <>
                  <Button variant="outline" onClick={addNewKey}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Key
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Object.entries(editMode ? editedData : selectedSecret.data).map(([key, value]) => (
                <Card key={key} className="bg-background/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium text-foreground">{key}</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowValue(key)}
                          className="text-primary"
                        >
                          {showValues.has(key) ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                        {editMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKey(key)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    {editMode ? (
                      <Input
                        type={showValues.has(key) ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="font-mono"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-background rounded-lg font-mono text-sm text-muted-foreground">
                        {showValues.has(key) ? value : '••••••••••••••••'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Secret Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the secret "{selectedSecret?.name}"? This change will be applied immediately to the cluster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
