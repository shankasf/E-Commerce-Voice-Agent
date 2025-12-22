import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/authcontext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';

import MyTickets from './pages/MyTickets';
import MyDevices from './pages/MyDevices';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default route: Redirect to Login */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new-ticket" element={<ProtectedRoute><NewTicket /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute><MyDevices /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;