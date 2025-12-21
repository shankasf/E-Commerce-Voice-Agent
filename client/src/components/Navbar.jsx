import { useContext } from 'react';
import { AuthContext } from '../context/authcontext';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="bg-slate-800 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <span className="font-bold text-xl tracking-tight">URACK IT</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded-full">
                            <User size={16} />
                            <span className="text-sm font-medium">{user?.name}</span>
                        </div>

                        <button
                            onClick={logout}
                            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;