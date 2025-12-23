import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  OverviewPage,
  CallsPage,
  TicketsPage,
  DevicesPage,
  OrganizationsPage,
  ContactsPage,
  SystemPage,
  CostsPage,
} from './pages';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/v2/dashboard">
        <Routes>
          {/* Dashboard Routes */}
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/costs" element={<CostsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
