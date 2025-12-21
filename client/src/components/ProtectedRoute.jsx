import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    // If no user, kick them to Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Otherwise, show the protected page
    return children;
};

export default ProtectedRoute;