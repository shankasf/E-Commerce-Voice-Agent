import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
    HomeIcon,
    CalendarIcon,
    ScissorsIcon,
    UserGroupIcon,
    UsersIcon,
    PhoneIcon,
    Cog6ToothIcon,
    Bars3Icon,
    XMarkIcon,
    ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Appointments', href: '/admin/appointments', icon: CalendarIcon },
    { name: 'Services', href: '/admin/services', icon: ScissorsIcon },
    { name: 'Stylists', href: '/admin/stylists', icon: UserGroupIcon },
    { name: 'Customers', href: '/admin/customers', icon: UsersIcon },
    { name: 'Call Logs', href: '/admin/calls', icon: PhoneIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuthStore();

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 w-64 bg-white">
                    <div className="flex h-16 items-center justify-between px-6 border-b">
                        <span className="text-xl font-bold text-primary-600">GlamBook</span>
                        <button onClick={() => setSidebarOpen(false)}>
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <nav className="px-4 py-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${location.pathname === item.href
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex flex-col flex-grow bg-white border-r">
                    <div className="flex h-16 items-center px-6 border-b">
                        <span className="text-xl font-bold text-primary-600">✨ GlamBook</span>
                        <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Admin</span>
                    </div>
                    <nav className="flex-1 px-4 py-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${location.pathname === item.href
                                        ? 'bg-primary-50 text-primary-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-primary-600 font-medium">
                                    {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{user?.full_name}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                <div className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-white border-b px-4 lg:px-8">
                    <button
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                </div>

                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
