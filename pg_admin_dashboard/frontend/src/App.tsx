import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Database } from './pages/Database';
import { TableView } from './pages/TableView';
import { SqlEditor } from './pages/SqlEditor';
import { Users } from './pages/Users';
import { Performance } from './pages/Performance';
import { Backup } from './pages/Backup';
import { Settings } from './pages/Settings';
import { Views } from './pages/Views';
import { Functions } from './pages/Functions';
import { Triggers } from './pages/Triggers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="db/:dbName" element={<Database />} />
        <Route path="db/:dbName/table/:schema/:table" element={<TableView />} />
        <Route path="db/:dbName/sql" element={<SqlEditor />} />
        <Route path="db/:dbName/views" element={<Views />} />
        <Route path="db/:dbName/functions" element={<Functions />} />
        <Route path="db/:dbName/triggers" element={<Triggers />} />
        <Route path="performance" element={<Performance />} />
        <Route path="backup" element={<Backup />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
