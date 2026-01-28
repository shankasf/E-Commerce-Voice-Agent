import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PodsPage from './pages/PodsPage';
import DeploymentsPage from './pages/DeploymentsPage';
import LogsPage from './pages/LogsPage';
import SecretsPage from './pages/SecretsPage';
import ConfigMapsPage from './pages/ConfigMapsPage';
import EventsPage from './pages/EventsPage';
import { LoadingSpinner } from './components/common';
import type { ReactNode } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Placeholder pages (to be implemented)
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">This page is under construction</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-400">Coming soon...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pods" element={<PodsPage />} />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/secrets" element={<SecretsPage />} />
        <Route path="/configmaps" element={<ConfigMapsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/alerts" element={<PlaceholderPage title="Alerts" />} />
        <Route path="/audit" element={<PlaceholderPage title="Audit Logs" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
