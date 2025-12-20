'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrentUser, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: CurrentUser | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

// Default context for SSR - prevents errors during prerendering
const defaultContext: AuthContextType = {
  user: null,
  login: () => { },
  logout: () => { },
  isLoading: true,
};

const AuthContext = createContext<AuthContextType>(defaultContext);

// Hardcoded users for demo purposes
const DEMO_USERS: Record<UserRole, CurrentUser> = {
  requester: {
    role: 'requester',
    id: 1,
    name: 'John Smith',
    email: 'john.smith@acmecorp.com',
    organization_id: 1,
  },
  admin: {
    role: 'admin',
    id: 100,
    name: 'Admin User',
    email: 'admin@urackit.com',
  },
  agent: {
    role: 'agent',
    id: 2, // support_agent_id - Alex Support (Human agent)
    name: 'Alex Support',
    email: 'alex@urackit.com',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for stored login only on client
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('urackit_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('urackit_user');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole) => {
    const demoUser = DEMO_USERS[role];
    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urackit_user', JSON.stringify(demoUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('urackit_user');
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
