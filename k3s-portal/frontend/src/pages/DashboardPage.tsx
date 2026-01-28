import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Server,
  Box,
  Activity,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Settings,
  Lock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardApi, namespacesApi } from '@/services/api';
import type { ClusterInfo, Namespace } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface MetricCardProps {
  icon: typeof Server;
  label: string;
  value: number | string;
  subValue?: string;
  iconColor: string;
  iconBgColor: string;
}

function MetricCard({ icon: Icon, label, value, subValue, iconColor, iconBgColor }: MetricCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {subValue && <p className="text-xs text-green-500">{subValue}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface QuickLinkProps {
  to: string;
  icon: typeof Server;
  title: string;
  description: string;
  iconColor: string;
  iconBgColor: string;
}

function QuickLink({ to, icon: Icon, title, description, iconColor, iconBgColor }: QuickLinkProps) {
  return (
    <motion.div variants={itemVariants}>
      <Link to={to}>
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all group cursor-pointer h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export function DashboardPage() {
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clusterData, namespacesData] = await Promise.all([
          dashboardApi.getClusterInfo(),
          namespacesApi.list(),
        ]);

        setClusterInfo(clusterData);
        setNamespaces(namespacesData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const pendingPods = (clusterInfo?.totalPods || 0) - (clusterInfo?.runningPods || 0) - (clusterInfo?.failedPods || 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Kubernetes cluster overview</p>
      </motion.div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Server}
          label="Namespaces"
          value={clusterInfo?.namespaceCount || 0}
          iconColor="text-blue-400"
          iconBgColor="bg-blue-500/20"
        />
        <MetricCard
          icon={Box}
          label="Total Pods"
          value={clusterInfo?.totalPods || 0}
          subValue={`${clusterInfo?.runningPods || 0} running`}
          iconColor="text-green-400"
          iconBgColor="bg-green-500/20"
        />
        <MetricCard
          icon={Activity}
          label="Deployments"
          value={clusterInfo?.totalDeployments || 0}
          iconColor="text-purple-400"
          iconBgColor="bg-purple-500/20"
        />
        <MetricCard
          icon={clusterInfo?.failedPods && clusterInfo.failedPods > 0 ? XCircle : CheckCircle}
          label="Failed Pods"
          value={clusterInfo?.failedPods || 0}
          iconColor={clusterInfo?.failedPods && clusterInfo.failedPods > 0 ? 'text-red-400' : 'text-green-400'}
          iconBgColor={clusterInfo?.failedPods && clusterInfo.failedPods > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}
        />
      </div>

      {/* Pod Status Summary */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Pod Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Running</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{clusterInfo?.runningPods || 0}</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Pending</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{pendingPods}</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">Failed</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{clusterInfo?.failedPods || 0}</span>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Namespaces */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Managed Namespaces</CardTitle>
            <Link to="/pods">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View all pods <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {namespaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {namespaces.map((ns, index) => (
                  <motion.div
                    key={ns.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/pods?namespace=${ns.name}`}>
                      <Card className="bg-card/30 border-border/50 hover:bg-card/60 hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Server className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-foreground truncate">{ns.name}</h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  Status: {ns.status}
                                </p>
                              </div>
                            </div>
                            <Badge variant={ns.status === 'Active' ? 'success' : 'warning'} className="flex-shrink-0">
                              {ns.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No managed namespaces found
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickLink
          to="/logs"
          icon={FileText}
          title="View Logs"
          description="Stream real-time logs"
          iconColor="text-blue-400"
          iconBgColor="bg-blue-500/20"
        />
        <QuickLink
          to="/deployments"
          icon={Activity}
          title="Deployments"
          description="Scale and restart"
          iconColor="text-purple-400"
          iconBgColor="bg-purple-500/20"
        />
        <QuickLink
          to="/secrets"
          icon={Lock}
          title="Secrets"
          description="Manage secrets"
          iconColor="text-amber-400"
          iconBgColor="bg-amber-500/20"
        />
        <QuickLink
          to="/configmaps"
          icon={Settings}
          title="ConfigMaps"
          description="Manage configs"
          iconColor="text-green-400"
          iconBgColor="bg-green-500/20"
        />
      </div>
    </motion.div>
  );
}

export default DashboardPage;
