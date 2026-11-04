import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Bell, MapPin, Activity, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(3);

  const isLogin = location.pathname === '/' || location.pathname === '/login';
  const isRegister = location.pathname === '/register';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-resq-deep/90 backdrop-blur-md border-b border-slate-800 z-40 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {!isLogin && !isRegister && (
          <button onClick={onMenuToggle} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-water to-cyan-600 flex items-center justify-center text-[10px] font-bold shadow-[0_0_12px_rgba(14,165,233,0.5)]">
            {user?.fullName?.[0] || user?.email?.[0] || 'R'}
          </div>
          <div className="hidden md:flex flex-col">
            <h1 className="text-sm font-bold text-white leading-none">ResQ</h1>
            <p className="text-[10px] text-slate-400 leading-none">Galamsey &amp; Water Watch</p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <a
            href="/dashboard"
            className={`px-3 py-2 rounded-lg transition-all ${
              location.pathname === '/dashboard'
                ? 'bg-water text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3 h-3 mr-1.5" /> Dashboard
          </a>
          <a
            href="/reports"
            className={`px-3 py-2 rounded-lg transition-all ${
              location.pathname === '/reports'
                ? 'bg-water text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3 h-3 mr-1.5" /> Reports
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-resq-deep"></span>
            )}
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{user?.fullName || user?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block" />
    </header>
  );
}