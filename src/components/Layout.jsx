import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, CreditCard, ShoppingBag, Bell, ShieldCheck, LogOut } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-lg">
            {/* Header */}
            <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold">SyriaSP</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm opacity-90">{user?.name || user?.email}</span>
                    <button onClick={handleLogout} className="p-1 hover:bg-blue-700 rounded">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                <Outlet />
            </main>

            {/* Bottom Nav */}
            <nav className="border-t bg-white flex justify-around py-2">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                    }
                >
                    <Home size={20} />
                    <span>الرئيسية</span>
                </NavLink>
                <NavLink
                    to="/orders"
                    className={({ isActive }) =>
                        `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                    }
                >
                    <ShoppingBag size={20} />
                    <span>الطلبات</span>
                </NavLink>
                <NavLink
                    to="/cards"
                    className={({ isActive }) =>
                        `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                    }
                >
                    <CreditCard size={20} />
                    <span>البطاقات</span>
                </NavLink>
                <NavLink
                    to="/notifications"
                    className={({ isActive }) =>
                        `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                    }
                >
                    <Bell size={20} />
                    <span>الإشعارات</span>
                </NavLink>
                <NavLink
                    to="/identity"
                    className={({ isActive }) =>
                        `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                    }
                >
                    <ShieldCheck size={20} />
                    <span>التوثيق</span>
                </NavLink>
            </nav>
        </div>
    );
}
