import { useState } from 'react';
import { X, MapPin, Activity, ShieldAlert, Map, Satellite, Globe, Settings, LogOut, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Map },
  { href: '/report', label: 'Submit Report', icon: MapPin },
  { href: '/reports', label: 'Activity Feed', icon: Activity },
  { href: '/satellite', label: 'Satellite Overlays', icon: Satellite },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 md:w-64`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-water to-cyan-600 flex items-center justify-center text-[10px] font-bold shadow-[0_0_12px_rgba(14,165,233,0.5)]">
            {user?.fullName?.[0] || user?.email?.[0] || 'R'}
          </div>
          <span className="font-bold text-white text-sm tracking-tight">ResQ</span>
        </div>
        {isOpen && (
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-4 px-2">Navigation</p>
        {NAV.map((item) => {
          const active = location.pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-water/10 text-water border border-water/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon className={`w-4 h-4 ${active ? 'text-water' : 'text-slate-600'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Account</div>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-4">
            {user?.fullName || 'Guest'}
          </p>
        </div>
      </div>
    </aside>
  );
}