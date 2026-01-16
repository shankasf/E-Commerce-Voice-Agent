'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrentUser, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: CurrentUser | null;
  login: (role: UserRole) => void;
  loginWithContact: (contact: CurrentUser) => void;
  logout: () => void;
  isLoading: boolean;
  switchAgent?: (agentId: number, agentName: string) => void;
}

// Default context for SSR - prevents errors during prerendering
const defaultContext: AuthContextType = {
  user: null,
  login: () => { },
  loginWithContact: () => { },
  logout: () => { },
  isLoading: true,
  switchAgent: () => { },
};

const AuthContext = createContext<AuthContextType>(defaultContext);

// Hardcoded users for demo purposes (Admin and Agent only)
const DEMO_USERS: Record<'admin' | 'agent', CurrentUser> = {
  admin: {
    role: 'admin',
    id: 100,
    name: 'Admin User',
    email: 'admin@urackit.com',
  },
  agent: {
    role: 'agent',
    id: 4, // support_agent_id - Support Agent 1 (Human agent)
    name: 'Support Agent 1',
    email: 'agent1@urackit.com',
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
    // Only admin and agent can use demo login
    if (role === 'admin' || role === 'agent') {
      const demoUser = DEMO_USERS[role];
      setUser(demoUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('urackit_user', JSON.stringify(demoUser));
      }
    }
  };

  const loginWithContact = (contact: CurrentUser) => {
    setUser(contact);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urackit_user', JSON.stringify(contact));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('urackit_user');
    }
  };

  const switchAgent = (agentId: number, agentName: string) => {
    const newUser: CurrentUser = {
      role: 'agent',
      id: agentId,
      name: agentName,
      email: `agent${agentId}@urackit.com`,
    };
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urackit_user', JSON.stringify(newUser));
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithContact, logout, isLoading, switchAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
