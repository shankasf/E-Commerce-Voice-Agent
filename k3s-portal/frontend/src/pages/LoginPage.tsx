import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, User, Server, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await authApi.login(data);
      login(response.accessToken, response.user);
      navigate('/');
    } catch {
      setError('root', { message: 'Invalid username or password' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="bg-orb bg-orb-1 absolute -top-40 -left-40"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="bg-orb bg-orb-2 absolute -bottom-40 -right-40"
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="bg-orb bg-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Logo Header */}
      <div className="absolute top-0 left-0 p-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-foreground">K8s Portal</span>
            <p className="text-xs text-muted-foreground">Kubernetes Dashboard</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row min-h-screen">
        {/* Left Column - Hero Section */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Manage your{' '}
              <span className="gradient-text-static">infrastructure</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Monitor pods, scale deployments, and manage your Kubernetes clusters with a modern, intuitive interface.
            </p>

            {/* Feature List */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/30 border border-border/30"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Secure Access</h3>
                  <p className="text-sm text-muted-foreground">Role-based access control</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/30 border border-border/30"
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Real-time</h3>
                  <p className="text-sm text-muted-foreground">Live logs and metrics</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/30 border border-border/30"
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Monitoring</h3>
                  <p className="text-sm text-muted-foreground">Cluster health tracking</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            {/* Login Card */}
            <Card className="border-border/30 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-black/40">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Welcome back
                </CardTitle>
                <CardDescription className="text-muted-foreground/70">
                  Sign in to access your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {errors.root && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      {errors.root.message}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-foreground/80">
                      Username
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-300" />
                      <Input
                        id="username"
                        placeholder="Enter username"
                        className="pl-12 h-12"
                        {...register('username')}
                      />
                    </div>
                    {errors.username && (
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-destructive font-medium"
                      >
                        {errors.username.message}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-300" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        className="pl-12 h-12"
                        {...register('password')}
                      />
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-destructive font-medium"
                      >
                        {errors.password.message}
                      </motion.p>
                    )}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="pt-2"
                  >
                    <Button
                      type="submit"
                      variant="gradient"
                      size="lg"
                      className="w-full h-12 text-base font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Sign in
                          <motion.span
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            →
                          </motion.span>
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-center text-muted-foreground/60 text-sm mt-6"
            >
              Secure access to your Kubernetes clusters
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
