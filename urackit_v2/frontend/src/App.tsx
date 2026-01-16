import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context';
import { VoiceWidget } from './components/voice';
import {
  OverviewPage,
  CallsPage,
  LiveCallsPage,
  QualityMetricsPage,
  AnalyticsPage,
  CompliancePage,
  TicketsPage,
  DevicesPage,
  OrganizationsPage,
  ContactsPage,
  SystemPage,
  CostsPage,
  LoginPage,
  RequesterDashboard,
  AgentDashboard,
} from './pages';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import type { UserRole } from './context/AuthContext';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Role-based Route Component - only allows specific roles
function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === 'requester') {
      return <Navigate to="/requester" replace />;
    } else if (role === 'agent') {
      return <Navigate to="/agent" replace />;
    } else {
      return <Navigate to="/overview" replace />;
    }
  }

  return <>{children}</>;
}

// Smart redirect based on role after login
function RoleBasedRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to appropriate dashboard based on role
  switch (role) {
    case 'requester':
      return <Navigate to="/requester" replace />;
    case 'agent':
      return <Navigate to="/agent" replace />;
    case 'admin':
    default:
      return <Navigate to="/overview" replace />;
  }
}

// App Content (needs to be inside AuthProvider)
function AppContent() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Don't show VoiceWidget on login page or role-specific dashboards (they have their own)
  const roleSpecificPages = ['/requester', '/agent'];
  const showVoiceWidget = isAuthenticated &&
    location.pathname !== '/login' &&
    !roleSpecificPages.includes(location.pathname);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Smart Role-Based Redirect */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Role-Specific Dashboards */}
        <Route path="/requester" element={<ProtectedRoute><RequesterDashboard /></ProtectedRoute>} />
        <Route path="/agent" element={<RoleRoute allowedRoles={['agent', 'admin']}><AgentDashboard /></RoleRoute>} />

        {/* Admin-Only Dashboard Routes */}
        <Route path="/overview" element={<RoleRoute allowedRoles={['admin']}><OverviewPage /></RoleRoute>} />
        <Route path="/calls" element={<RoleRoute allowedRoles={['admin']}><CallsPage /></RoleRoute>} />
        <Route path="/live" element={<RoleRoute allowedRoles={['admin']}><LiveCallsPage /></RoleRoute>} />
        <Route path="/quality" element={<RoleRoute allowedRoles={['admin']}><QualityMetricsPage /></RoleRoute>} />
        <Route path="/analytics" element={<RoleRoute allowedRoles={['admin']}><AnalyticsPage /></RoleRoute>} />
        <Route path="/compliance" element={<RoleRoute allowedRoles={['admin']}><CompliancePage /></RoleRoute>} />
        <Route path="/tickets" element={<RoleRoute allowedRoles={['admin', 'agent']}><TicketsPage /></RoleRoute>} />
        <Route path="/devices" element={<RoleRoute allowedRoles={['admin']}><DevicesPage /></RoleRoute>} />
        <Route path="/organizations" element={<RoleRoute allowedRoles={['admin']}><OrganizationsPage /></RoleRoute>} />
        <Route path="/contacts" element={<RoleRoute allowedRoles={['admin']}><ContactsPage /></RoleRoute>} />
        <Route path="/system" element={<RoleRoute allowedRoles={['admin']}><SystemPage /></RoleRoute>} />
        <Route path="/costs" element={<RoleRoute allowedRoles={['admin']}><CostsPage /></RoleRoute>} />

        {/* Fallback */}
        <Route path="*" element={<RoleBasedRedirect />} />
      </Routes>

      {/* Global Voice Widget - available on admin pages only (other dashboards have their own) */}
      {showVoiceWidget && <VoiceWidget />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
