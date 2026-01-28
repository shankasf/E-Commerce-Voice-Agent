import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileCode, RefreshCw, Loader2, Eye, Edit, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { configMapsApi, namespacesApi } from '@/services/api';
import type { ConfigMap } from '@/types';
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
import { cn } from '@/lib/utils';

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

export default function ConfigMapsPage() {
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedConfigMap, setSelectedConfigMap] = useState<ConfigMap | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [activeKey, setActiveKey] = useState<string>('');

  const { data: namespaces, isLoading: namespacesLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: namespacesApi.list,
  });

  const { data: configMaps, isLoading: configMapsLoading, refetch } = useQuery({
    queryKey: ['configmaps', selectedNamespace],
    queryFn: () => configMapsApi.list(selectedNamespace),
    enabled: !!selectedNamespace,
  });

  const updateMutation = useMutation({
    mutationFn: ({ namespace, name, data }: { namespace: string; name: string; data: Record<string, string> }) =>
      configMapsApi.update(namespace, name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configmaps', selectedNamespace] });
      setShowSaveConfirm(false);
      setEditMode(false);
      if (selectedConfigMap) {
        setSelectedConfigMap({ ...selectedConfigMap, data: editedData });
      }
    },
  });

  const handleEdit = (configMap: ConfigMap) => {
    setSelectedConfigMap(configMap);
    setEditedData({ ...configMap.data });
    setEditMode(true);
    const keys = Object.keys(configMap.data);
    setActiveKey(keys[0] || '');
  };

  const handleView = (configMap: ConfigMap) => {
    setSelectedConfigMap(configMap);
    setEditedData({ ...configMap.data });
    setEditMode(false);
    const keys = Object.keys(configMap.data);
    setActiveKey(keys[0] || '');
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    if (selectedConfigMap) {
      updateMutation.mutate({
        namespace: selectedConfigMap.namespace,
        name: selectedConfigMap.name,
        data: editedData,
      });
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  const addNewKey = () => {
    const newKey = `new-key-${Object.keys(editedData).length + 1}`;
    setEditedData((prev) => ({ ...prev, [newKey]: '' }));
    setActiveKey(newKey);
  };

  const removeKey = (key: string) => {
    setEditedData((prev) => {
      const updated = { ...prev };
      delete updated[key];
      const remainingKeys = Object.keys(updated);
      setActiveKey(remainingKeys[0] || '');
      return updated;
    });
  };

  const renameKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey.trim()) return;
    if (editedData[newKey] !== undefined) {
      alert('A key with this name already exists');
      return;
    }
    setEditedData((prev) => {
      const updated: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k === oldKey) {
          updated[newKey] = v;
        } else {
          updated[k] = v;
        }
      }
      return updated;
    });
    setActiveKey(newKey);
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
          <h1 className="text-2xl font-bold text-foreground">ConfigMaps</h1>
          <p className="text-muted-foreground mt-1">View and edit configuration data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedNamespace}
            onValueChange={(value) => {
              setSelectedNamespace(value);
              setSelectedConfigMap(null);
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

      {/* Loading State */}
      {(namespacesLoading || configMapsLoading) && (
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
            <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a namespace from the dropdown to view ConfigMaps</p>
          </CardContent>
        </Card>
      )}

      {selectedNamespace && !configMapsLoading && configMaps?.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No ConfigMaps found in the {selectedNamespace} namespace</p>
          </CardContent>
        </Card>
      )}

      {/* ConfigMaps List */}
      {configMaps && configMaps.length > 0 && !selectedConfigMap && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {configMaps.map((cm) => (
            <motion.div key={cm.name} variants={itemVariants}>
              <Card className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{cm.name}</h3>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/70">Keys:</span> {Object.keys(cm.data).length}
                        <span className="mx-2">|</span>
                        <span className="text-muted-foreground/70">Created:</span>{' '}
                        {new Date(cm.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(cm)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {canEdit() && (
                        <Button variant="default" size="sm" onClick={() => handleEdit(cm)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ConfigMap Editor */}
      {selectedConfigMap && (
        <Card className="bg-card/50 border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedConfigMap.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {Object.keys(editedData).length} keys
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConfigMap(null);
                  setEditMode(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {!editMode && canEdit() && (
                <Button variant="default" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
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

          <div className="flex h-[500px]">
            {/* Key List */}
            <div className="w-64 border-r border-border overflow-y-auto bg-background/50">
              {Object.keys(editedData).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveKey(key)}
                  className={cn(
                    'w-full text-left px-4 py-3 text-sm border-b border-border transition-colors',
                    activeKey === key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <div className="truncate">{key}</div>
                </button>
              ))}
            </div>

            {/* Value Editor */}
            <div className="flex-1 flex flex-col">
              {activeKey ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
                    {editMode ? (
                      <Input
                        value={activeKey}
                        onChange={(e) => renameKey(activeKey, e.target.value)}
                        className="font-mono text-sm max-w-xs"
                      />
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">{activeKey}</span>
                    )}
                    {editMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKey(activeKey)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Key
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    {editMode ? (
                      <textarea
                        value={editedData[activeKey] || ''}
                        onChange={(e) => handleValueChange(activeKey, e.target.value)}
                        className="w-full h-full font-mono text-sm p-3 border border-border bg-background text-foreground rounded-lg resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter value..."
                      />
                    ) : (
                      <pre className="w-full h-full font-mono text-sm p-3 bg-background/50 rounded-lg overflow-auto whitespace-pre-wrap text-muted-foreground">
                        {editedData[activeKey] || '(empty)'}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a key to view its value
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Save Confirmation */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save ConfigMap Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the ConfigMap "{selectedConfigMap?.name}"? This change will be applied immediately to the cluster.
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
