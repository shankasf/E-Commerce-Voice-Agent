import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
    HomeIcon,
    CalendarIcon,
    PlusCircleIcon,
    UserIcon,
    Bars3Icon,
    XMarkIcon,
    ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Appointments', href: '/dashboard/appointments', icon: CalendarIcon },
    { name: 'Book Appointment', href: '/dashboard/book', icon: PlusCircleIcon },
    { name: 'My Profile', href: '/dashboard/profile', icon: UserIcon },
];

export default function CustomerLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuthStore();

    return (
        <div className="min-h-screen bg-gray-50">
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
                                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
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
                    <div className="flex-1">
                        <h1 className="text-lg font-medium text-gray-900">
                            Welcome back, {user?.first_name}!
                        </h1>
                    </div>
                </div>

                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
