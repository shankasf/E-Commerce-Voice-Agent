import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { VoiceWidget } from '@/components/VoiceWidget';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Admin pages
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminAppointments from '@/pages/admin/Appointments';
import AdminServices from '@/pages/admin/Services';
import AdminStylists from '@/pages/admin/Stylists';
import AdminCustomers from '@/pages/admin/Customers';
import AdminCalls from '@/pages/admin/Calls';
import AdminSettings from '@/pages/admin/Settings';

// Customer pages
import CustomerLayout from '@/components/layouts/CustomerLayout';
import CustomerDashboard from '@/pages/customer/Dashboard';
import MyAppointments from '@/pages/customer/MyAppointments';
import BookAppointment from '@/pages/customer/BookAppointment';
import CustomerProfile from '@/pages/customer/Profile';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
    }

    return <>{children}</>;
}

function App() {
    const { isAuthenticated, user } = useAuthStore();

    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                    isAuthenticated ? (
                        <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
                    ) : (
                        <Login />
                    )
                } />
                <Route path="/register" element={
                    isAuthenticated ? (
                        <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
                    ) : (
                        <Register />
                    )
                } />

                {/* Admin routes */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="appointments" element={<AdminAppointments />} />
                    <Route path="services" element={<AdminServices />} />
                    <Route path="stylists" element={<AdminStylists />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="calls" element={<AdminCalls />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Customer routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<CustomerDashboard />} />
                    <Route path="appointments" element={<MyAppointments />} />
                    <Route path="book" element={<BookAppointment />} />
                    <Route path="profile" element={<CustomerProfile />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={
                    isAuthenticated ? (
                        <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } />

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Voice Widget */}
            {isAuthenticated && <VoiceWidget />}
        </BrowserRouter>
    );
}

export default App;
