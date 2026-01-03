'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/supabase';
import { User, Shield, Headphones, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

type LoginStep = 'select-role' | 'ue-code' | 'user-details' | 'error';

interface OrganizationInfo {
  organization_id: number;
  name: string;
  u_e_code: number;
}

interface ManagerInfo {
  name: string;
  email: string;
  phone: string;
}

export default function LoginPage() {
  const { user, login, loginWithContact, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<LoginStep>('select-role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // U&E Code flow state
  const [ueCode, setUeCode] = useState('');
  const [ueError, setUeError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [manager, setManager] = useState<ManagerInfo | null>(null);

  // User details state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && user) {
      window.location.href = `/dashboard/${user.role}`;
    }
  }, [user, isLoading, mounted]);

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'requester') {
      setSelectedRole(role);
      setStep('ue-code');
    } else {
      // Admin and Agent use direct login
      login(role);
      window.location.href = `/dashboard/${role}`;
    }
  };

  const handleValidateUeCode = async () => {
    if (!ueCode.trim()) {
      setUeError('Please enter your U&E code');
      return;
    }

    setIsValidating(true);
    setUeError('');

    try {
      const response = await fetch('/api/auth/validate-ue-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ueCode: parseInt(ueCode.trim()) }),
      });

      const data = await response.json();

      if (!data.success) {
        setUeError(data.error);
        setStep('error');
        return;
      }

      setOrganization(data.organization);
      setManager(data.manager);
      setStep('user-details');
    } catch (error) {
      setUeError('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateContact = async () => {
    if (!fullName.trim() || !email.trim()) {
      setDetailsError('Please enter your name and email');
      return;
    }

    if (!email.includes('@')) {
      setDetailsError('Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    setDetailsError('');

    try {
      const response = await fetch('/api/auth/create-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          organizationId: organization?.organization_id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setDetailsError(data.error);
        return;
      }

      // Login with the contact info
      loginWithContact({
        role: 'requester',
        id: data.contact.contact_id,
        name: data.contact.full_name,
        email: data.contact.email,
        organization_id: data.contact.organization_id,
      });

      window.location.href = '/dashboard/requester';
    } catch (error) {
      setDetailsError('An error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    setStep('select-role');
    setSelectedRole(null);
    setUeCode('');
    setUeError('');
    setOrganization(null);
    setManager(null);
    setFullName('');
    setEmail('');
    setDetailsError('');
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

  // Error Screen
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              U&E Code Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              {ueError || "I'm sorry, I could not find that U E code in our system. Please contact your organization administrator to get your U E code and come back again. Thank you."}
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // U&E Code Input Screen
  if (step === 'ue-code') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to U Rack IT Support
              </h1>
              <p className="text-gray-600">
                May I have your U&E code please to proceed?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="ueCode" className="block text-sm font-medium text-gray-700 mb-2">
                  U&E Code
                </label>
                <input
                  type="text"
                  id="ueCode"
                  value={ueCode}
                  onChange={(e) => setUeCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your U&E code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              {ueError && (
                <p className="text-red-600 text-sm text-center">{ueError}</p>
              )}

              <button
                onClick={handleValidateUeCode}
                disabled={isValidating || ueCode.length < 1}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User Details Screen (after U&E validation)
  if (step === 'user-details' && organization && manager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Organization Verified */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Organization Verified</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Organization:</strong> {organization.name}</p>
                <p><strong>Account Manager:</strong> {manager.name}</p>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Create Your Profile
              </h2>
              <p className="text-gray-600 text-sm">
                Please enter your details to continue
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {detailsError && (
                <p className="text-red-600 text-sm text-center">{detailsError}</p>
              )}

              <button
                onClick={handleCreateContact}
                disabled={isCreating || !fullName.trim() || !email.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role Selection Screen (default)
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
              onClick={() => handleRoleSelect(option.role)}
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
          <p>Select a role to continue</p>
        </div>
      </div>
    </div>
  );
}
