import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Ticket,
    Monitor,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    User,
    Loader2
} from 'lucide-react';
import { AuthContext } from '../context/authcontext';
import api from '../services/api';

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

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'System Online', message: 'All services are operational.', time: new Date(), read: false }
    ]);

    // Profile Menu State
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Ticket, label: 'My Tickets', path: '/tickets' },
        { icon: Monitor, label: 'Assets', path: '/devices' },
    ];

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setIsSearching(true);
                try {
                    // Client-side filtering (ideally specific search endpoint)
                    const res = await api.get('/tickets');
                    const filtered = res.data.filter(t =>
                        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.id.toString().includes(searchQuery)
                    );
                    setSearchResults(filtered.slice(0, 5)); // Limit to 5 results
                } catch (err) {
                    console.error("Search failed", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef]);


    const handleMarkAllRead = () => {
        setNotifications([]);
        // setShowNotifications(false); // Optional: keep open or close
    };

    const handleResultClick = (ticketId) => {
        navigate(`/tickets/${ticketId}`);
        setSearchQuery('');
        setSearchResults([]);
    };

    const unreadCount = notifications.length;

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex font-sans">
            {/* Sidebar */}
            <motion.aside
                initial={{ width: 260 }}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="bg-white h-screen fixed left-0 top-0 border-r border-gray-100 z-50 flex flex-col justify-between hidden md:flex"
            >
                <div className="p-6">
                    <div
                        className="flex items-center space-x-3 mb-10 cursor-pointer"
                        onClick={() => navigate('/dashboard')}
                    >
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

            {/* Mobile Header logic omitted for brevity, assuming desktop focus */}

            {/* Main Content */}
            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-[260px]' : 'md:ml-[80px]'}`}>
                {/* Top Header */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 px-8 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">
                        {location.pathname.replace('/', '') || 'Dashboard'}
                    </h2>

                    <div className="flex items-center space-x-6">
                        {/* Search Bar */}
                        <div className="relative hidden md:block" ref={searchRef}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
                            />
                            {/* Search Dropdown */}
                            <AnimatePresence>
                                {(searchResults.length > 0 || isSearching) && searchQuery.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-12 left-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        {isSearching ? (
                                            <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center">
                                                <Loader2 className="animate-spin mr-2" size={16} /> Searching...
                                            </div>
                                        ) : resultsFound(searchResults) ? (
                                            <ul className="divide-y divide-gray-50">
                                                {searchResults.map(ticket => (
                                                    <li
                                                        key={ticket.id}
                                                        onClick={() => handleResultClick(ticket.id)}
                                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 line-clamp-1">{ticket.subject}</p>
                                                                <p className="text-xs text-gray-500">#{ticket.id} • {ticket.status}</p>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full mt-1.5 ${ticket.priority === 'Critical' ? 'bg-red-500' :
                                                                ticket.priority === 'High' ? 'bg-orange-500' : 'bg-blue-400'
                                                                }`}></div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-4 text-center text-gray-500 text-sm">No tickets found.</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-4 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right">
                                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notifications</span>
                                        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                                                    <div className="flex items-start">
                                                        <div className="w-2 h-2 mt-1.5 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.time).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-400 text-sm">
                                                All caught up!
                                            </div>
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50 text-center">
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                            >
                                                Mark all as read
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Profile Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center space-x-3 border-l pl-6 border-gray-200 hover:opacity-80 transition-opacity"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-gray-800">
                                        {user?.name || user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500">Engineer</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white font-bold">
                                    {user?.name ? user.name.charAt(0) : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                                </div>
                            </button>

                            {/* Profile Dropdown */}
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-4 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right">
                                    <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                                        <p className="text-sm font-bold text-gray-800">{user?.name || 'User'}</p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            logout();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                    >
                                        <LogOut size={16} className="mr-2" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
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

// Helper for cleaner JSX
const resultsFound = (results) => results && results.length > 0;

export default Layout;