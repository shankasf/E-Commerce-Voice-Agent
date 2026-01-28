import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../services/api';
import { websocketService } from '../services/websocket';
import type { User, UserRole, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canEdit: () => boolean;
  canManageSecrets: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const user = await authApi.getProfile();
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('user', JSON.stringify(user));

          // Connect WebSocket
          websocketService.connect();
        } catch {
          // Token invalid, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    websocketService.connect();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      websocketService.disconnect();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const user = await authApi.getProfile();
      localStorage.setItem('user', JSON.stringify(user));
      setState((prev) => ({ ...prev, user }));
    } catch {
      // If refresh fails, log out
      await logout();
    }
  }, [state.isAuthenticated, logout]);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!state.user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(state.user.role);
    },
    [state.user]
  );

  const canEdit = useCallback((): boolean => {
    return hasRole(['admin', 'operator']);
  }, [hasRole]);

  const canManageSecrets = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
        hasRole,
        canEdit,
        canManageSecrets,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
