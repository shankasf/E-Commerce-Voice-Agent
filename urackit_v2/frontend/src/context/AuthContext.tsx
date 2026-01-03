import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Role types with different access levels
export type UserRole = 'admin' | 'agent' | 'requester';

interface User {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    role: UserRole;
    login: (token: string, userData: User) => void;
    logout: () => void;
    // Voice widget permissions based on role
    voicePermissions: {
        canInitiateCall: boolean;
        canViewTranscript: boolean;
        canAccessAllAgents: boolean;
        canEscalate: boolean;
        canViewCosts: boolean;
        maxCallDuration: number; // in minutes
    };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default permissions for each role
const rolePermissions: Record<UserRole, AuthContextType['voicePermissions']> = {
    admin: {
        canInitiateCall: true,
        canViewTranscript: true,
        canAccessAllAgents: true,
        canEscalate: true,
        canViewCosts: true,
        maxCallDuration: 60, // 60 minutes
    },
    agent: {
        canInitiateCall: true,
        canViewTranscript: true,
        canAccessAllAgents: false, // Only assigned agents
        canEscalate: true,
        canViewCosts: false,
        maxCallDuration: 30, // 30 minutes
    },
    requester: {
        canInitiateCall: true,
        canViewTranscript: false, // Cannot see full transcript
        canAccessAllAgents: false, // Only triage agent
        canEscalate: false, // Cannot manually escalate
        canViewCosts: false,
        maxCallDuration: 15, // 15 minutes
    },
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check for existing auth on mount
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                const userData = JSON.parse(storedUser) as User;
                setUser(userData);
                setIsAuthenticated(true);
            } catch {
                // Invalid stored data
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Default to requester role if not authenticated
    const role: UserRole = user?.role || 'requester';
    const voicePermissions = rolePermissions[role];

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                role,
                login,
                logout,
                voicePermissions,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { AuthContext };
