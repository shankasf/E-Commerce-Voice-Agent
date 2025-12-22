import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Ticket,
    Monitor,
    LogOut,
    Menu,
    X,
    Bell,
    Search
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/authcontext';

const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium text-sm">{label}</span>
    </motion.button>
);

const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Ticket, label: 'My Tickets', path: '/tickets' }, // We will build this page later
        { icon: Monitor, label: 'Assets', path: '/devices' }, // We will build this page later
    ];

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex font-sans">
            {/* Sidebar */}
            <motion.aside
                initial={{ width: 260 }}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="bg-white h-screen fixed left-0 top-0 border-r border-gray-100 z-50 flex flex-col justify-between hidden md:flex"
            >
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-10">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            IT
                        </div>
                        {isSidebarOpen && <span className="text-xl font-bold text-gray-800 tracking-tight">URACK IT</span>}
                    </div>

                    <nav className="space-y-2">
                        {menuItems.map((item) => (
                            <SidebarItem
                                key={item.path}
                                icon={item.icon}
                                label={isSidebarOpen ? item.label : ''}
                                path={item.path}
                                active={location.pathname === item.path}
                                onClick={() => navigate(item.path)}
                            />
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className={`flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="font-medium text-sm">Sign Out</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Mobile Header (Only visible on small screens) */}
            {/* ... simplified for brevity, assume sidebar works ... */}

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-[260px]' : 'md:ml-[80px]'}`}>
                {/* Top Header */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 px-8 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">
                        {location.pathname.replace('/', '') || 'Dashboard'}
                    </h2>

                    <div className="flex items-center space-x-6">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
                            />
                        </div>
                        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                                <p className="text-xs text-gray-500">Engineer</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white font-bold">
                                {user?.name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;