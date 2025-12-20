'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/supabase';
import { User, Shield, Headphones } from 'lucide-react';

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && user) {
      // Redirect to appropriate dashboard
      window.location.href = `/tms/dashboard/${user.role}`;
    }
  }, [user, isLoading, mounted]);

  const handleLogin = (role: UserRole) => {
    login(role);
    // Use window.location for reliable navigation with basePath
    window.location.href = `/tms/dashboard/${role}`;
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const loginOptions = [
    {
      role: 'requester' as UserRole,
      title: 'Requester',
      description: 'Submit and track your support tickets',
      icon: User,
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      role: 'admin' as UserRole,
      title: 'Admin',
      description: 'Manage organizations, users, and reports',
      icon: Shield,
      color: 'bg-purple-500 hover:bg-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      role: 'agent' as UserRole,
      title: 'Human Agent',
      description: 'Handle escalated tickets and support requests',
      icon: Headphones,
      color: 'bg-green-500 hover:bg-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            U Rack IT
          </h1>
          <p className="text-xl text-gray-600">
            Ticket Management Console
          </p>
        </div>

        {/* Login Options */}
        <div className="grid md:grid-cols-3 gap-6">
          {loginOptions.map((option) => (
            <button
              key={option.role}
              onClick={() => handleLogin(option.role)}
              className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
            >
              <div className={`w-14 h-14 rounded-xl ${option.iconBg} flex items-center justify-center mb-4`}>
                <option.icon className={`w-7 h-7 ${option.iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {option.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {option.description}
              </p>
              <div className={`inline-block px-4 py-2 rounded-lg text-white text-sm font-medium ${option.color}`}>
                Login as {option.title}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-gray-500 text-sm">
          <p>Demo login - select a role to continue</p>
        </div>
      </div>
    </div>
  );
}
