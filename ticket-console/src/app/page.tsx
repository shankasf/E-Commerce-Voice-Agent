'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/supabase';
import { User, Shield, Headphones, Loader2, CheckCircle, XCircle, ArrowLeft, ChevronRight } from 'lucide-react';

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
  const { user, login, loginWithContact, logout, isLoading } = useAuth();
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

  // Don't auto-redirect from login page - let users see the login options
  // Users can manually select their role or continue if already logged in
  // The redirect will only happen after they explicitly choose a role
  // useEffect(() => {
  //   if (mounted && !isLoading && user) {
  //     window.location.href = `/dashboard/${user.role}`;
  //   }
  // }, [user, isLoading, mounted]);

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
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl animate-pulse shadow-2xl glow-blue"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-300 font-semibold text-lg">Loading...</p>
        </div>
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
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-300/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-md w-full relative animate-scale-in">
          <div className="surface-elevated p-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-50 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-gradient-to-br from-red-200 to-red-100 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              U&E Code Not Found
            </h2>
            <p className="text-slate-300 mb-10 leading-relaxed text-base font-medium">
              {ueError || "I'm sorry, I could not find that U&E code in our system. Please contact your organization administrator to get your U&E code and come back again. Thank you."}
            </p>
            <button
              onClick={handleBack}
              className="btn btn-primary w-full"
            >
              <ArrowLeft className="w-5 h-5" />
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
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-md w-full relative animate-scale-in">
          <div className="surface-elevated p-10">
            <button
              onClick={handleBack}
              className="flex items-center gap-2.5 text-slate-300 hover:text-slate-100 mb-10 transition-colors group font-medium"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>

            <div className="text-center mb-10">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-2xl glow-blue"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/30 to-transparent"></div>
                  <Shield className="w-12 h-12 text-white relative z-10" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-100 mb-3">
                Welcome to U Rack IT Support
              </h1>
              <div className="inline-block h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4"></div>
              <p className="text-slate-300 font-medium text-base">
                Please enter your U&E code to proceed
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="ueCode" className="block text-sm font-bold text-slate-300 mb-3 tracking-wide uppercase">
                  U&E Code
                </label>
                <input
                  type="text"
                  id="ueCode"
                  value={ueCode}
                  onChange={(e) => setUeCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000"
                  className="input text-center text-3xl tracking-[0.5em] font-bold py-4 bg-slate-800/50 border border-slate-700/50 text-slate-200"
                  autoFocus
                />
              </div>

              {ueError && (
                <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm animate-fade-in">
                  <p className="text-red-300 text-sm text-center font-medium">{ueError}</p>
                </div>
              )}

              <button
                onClick={handleValidateUeCode}
                disabled={isValidating || ueCode.length < 1}
                className="btn btn-primary w-full text-base py-3.5"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
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
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-green-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }}></div>
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-md w-full relative animate-scale-in">
          <div className="surface-elevated p-10">
            <button
              onClick={handleBack}
              className="flex items-center gap-2.5 text-slate-300 hover:text-slate-100 mb-10 transition-colors group font-medium"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>

            {/* Organization Verified - Enhanced Dark Theme */}
            <div className="relative bg-emerald-900/30 border border-emerald-700/50 rounded-2xl p-6 mb-8 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-bold text-emerald-200 text-lg">Organization Verified</span>
                </div>
                <div className="space-y-3 pl-18">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Organization</span>
                    <span className="text-base font-bold text-emerald-100">{organization.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Account Manager</span>
                    <span className="text-base font-semibold text-emerald-100">{manager.name}</span>
                  </div>
              </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">
                Create Your Profile
              </h2>
              <div className="inline-block h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-3"></div>
              <p className="text-slate-300 text-sm font-medium">
                Please enter your details to continue
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-bold text-slate-300 mb-3 tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="input bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-300 mb-3 tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  className="input bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500"
                />
              </div>

              {detailsError && (
                <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm animate-fade-in">
                  <p className="text-red-300 text-sm text-center font-medium">{detailsError}</p>
                </div>
              )}

              <button
                onClick={handleCreateContact}
                disabled={isCreating || !fullName.trim() || !email.trim()}
                className="btn btn-primary w-full text-base py-3.5"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    Continue to Dashboard
                    <ChevronRight className="w-5 h-5" />
                  </>
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
    <div className="min-h-screen relative overflow-hidden bg-layered p-4 md:p-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto animate-fade-in">
        {/* Show banner if user is already logged in */}
        {user && (
          <div className="mb-8 surface-elevated p-5 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-100">Already logged in as {user.name}</p>
                <p className="text-sm text-slate-300 font-medium">Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = `/dashboard/${user.role}`}
                className="btn btn-primary"
              >
                Continue to Dashboard
              </button>
              <button
                onClick={() => {
                  logout();
                  setStep('select-role');
                }}
                className="btn btn-secondary"
              >
                Switch Role
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="text-center mb-16 relative">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-2xl mb-8 glow-blue animate-scale-in relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent"></div>
            <Shield className="w-12 h-12 text-white relative z-10" />
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gradient-primary animate-fade-in" style={{ animationDelay: '0.1s' }}>
            U Rack IT
          </h1>
          <div className="inline-block h-1 w-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6"></div>
          <p className="text-2xl md:text-3xl text-slate-300 font-semibold mb-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Ticket Management Console
          </p>
          <p className="text-base text-slate-400 font-medium animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {user ? 'Select a different role or continue to your dashboard' : 'Enterprise-grade IT support ticket management system'}
          </p>
        </div>

        {/* Login Options */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {loginOptions.map((option, index) => (
            <button
              key={option.role}
              onClick={() => handleRoleSelect(option.role)}
              className="group relative surface-elevated p-8 text-left animate-slide-up"
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
              {/* Gradient Overlay on Hover - Dark Theme */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Icon Container - Dark Theme */}
              <div className={`relative w-20 h-20 rounded-2xl ${option.iconBg.replace('bg-blue-100', 'bg-blue-600/20').replace('bg-purple-100', 'bg-purple-600/20').replace('bg-green-100', 'bg-green-600/20')} border ${option.iconBg.includes('blue') ? 'border-blue-500/50' : option.iconBg.includes('purple') ? 'border-purple-500/50' : 'border-green-500/50'} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent"></div>
                <option.icon className={`w-10 h-10 ${option.iconColor.replace('text-blue-600', 'text-blue-400').replace('text-purple-600', 'text-purple-400').replace('text-green-600', 'text-green-400')} relative z-10`} />
              </div>

              {/* Content - Dark Theme */}
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-blue-400 transition-colors">
                {option.title}
              </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed font-medium">
                {option.description}
              </p>
                
                {/* CTA Button */}
                <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-white text-sm font-bold ${option.color} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-0.5`}>
                  <span>Access {option.title} Portal</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Decorative Element - Dark Theme */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-slate-600/40 group-hover:bg-blue-500/60 transition-colors"></div>
            </button>
          ))}
        </div>

        {/* Footer - Dark Theme */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <div className="inline-flex items-center gap-2 text-sm text-slate-400 font-medium bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
            <Shield className="w-4 h-4" />
            <span>Secure enterprise-grade platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
