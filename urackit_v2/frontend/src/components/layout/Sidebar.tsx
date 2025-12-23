import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Phone,
    Ticket,
    Monitor,
    Building2,
    Users,
    Activity,
    DollarSign,
    Settings,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/calls', label: 'Calls', icon: Phone },
    { path: '/tickets', label: 'Tickets', icon: Ticket },
    { path: '/devices', label: 'Devices', icon: Monitor },
    { path: '/organizations', label: 'Organizations', icon: Building2 },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/system', label: 'System Health', icon: Activity },
    { path: '/costs', label: 'Costs & ROI', icon: DollarSign },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    return (
        <aside
            className={clsx(
                'fixed left-0 top-0 h-full bg-dark-900 border-r border-dark-700 z-50 transition-all duration-300',
                collapsed ? 'w-20' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                            U Rack IT
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5 text-dark-400" />
                    ) : (
                        <ChevronLeft className="w-5 h-5 text-dark-400" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path ||
                        (item.path === '/overview' && location.pathname === '/');

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                                collapsed && 'justify-center px-0',
                                isActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                            )}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}

                {/* Settings */}
                <div className="pt-4 mt-4 border-t border-dark-700">
                    <Link
                        to="/settings"
                        className={clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:bg-dark-800 hover:text-white transition-all',
                            collapsed && 'justify-center px-0'
                        )}
                    >
                        <Settings className="w-5 h-5" />
                        {!collapsed && <span>Settings</span>}
                    </Link>
                </div>
            </nav>

            {/* Status */}
            <div className="absolute bottom-4 left-4 right-4">
                <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full pulse"></span>
                        {!collapsed && (
                            <span className="text-xs text-dark-400">System Online</span>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
