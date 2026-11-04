import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ReportForm from './components/ReportForm';
import ActivityFeed from './components/ActivityFeed';
import MapPanel from './components/MapPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/satellite" element={<SatellitePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading, user, logout } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="h-screen w-screen overflow-hidden bg-resq-deep flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col relative md:ml-0">
        <Header onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchComplaints = async () => {
      try {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setComplaints(data || []);
      } catch (err) {
        console.error('[ResQ] Failed to load complaints:', err.message);
        if (!cancelled) setComplaints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchComplaints();
    return () => { cancelled = true; };
  }, []);

  const highCount = complaints.filter((c) => c.severity === 'high').length;
  const pendingCount = complaints.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Dashboard</h2>
        <p className="text-slate-400 text-sm">Live monitoring of illegal mining and water pollution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="resq-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <ShieldAlert className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{complaints.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total reports</p>
        </div>
        <div className="resq-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <ShieldAlert className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{highCount}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">High severity</p>
        </div>
        <div className="resq-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <ShieldAlert className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{pendingCount}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Pending verification</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="resq-panel p-0 flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-3 h-3 text-water" /> Live Map
            </h3>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex-1 relative">
            <MapPanel complaints={complaints} addComplaint={() => {}} />
          </div>
        </div>
        <div className="resq-panel flex flex-col">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-3 h-3 text-water" /> Recent Activity
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <ActivityFeed complaints={complaints} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="resq-panel p-6">
        <h2 className="text-lg font-bold text-white mb-6">Submit a New Report</h2>
        <ReportForm onSuccess={() => {}} />
      </div>
    </div>
  );
}

function ReportsPage() {
  const [complaints, setComplaints] = useState([]);
  useEffect(() => {
    supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setComplaints(data || []));
  }, []);
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-bold text-white mb-6">All Reports</h2>
      <ActivityFeed complaints={complaints} />
    </div>
  );
}

function SatellitePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-bold text-white mb-6">Satellite Overlays</h2>
      <div className="resq-panel p-6">
        <p className="text-slate-400 text-sm mb-4">Switch between street, true-color, and turbidity/vegetation degradation layers from the map layer control.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Street Map', icon: 'Map', desc: 'OpenStreetMap standard tiles' },
            { name: 'True Color', icon: 'Satellite', desc: 'Sentinel-2 natural colour view' },
            { name: 'Degradation', icon: 'Globe', desc: 'NDWI / NDVI turbidity & canopy loss' },
          ].map((l) => (
            <div key={l.name} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <l.icon className="w-5 h-5 text-water mb-2" />
              <h4 className="text-sm font-semibold text-white">{l.name}</h4>
              <p className="text-xs text-slate-500">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-white mb-6">Settings</h2>
      <div className="resq-panel p-6">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Notifications</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Real-time alerts</span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  name="toggle"
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-slate-700 border-4 appearance-none cursor-pointer checked:bg-water checked:border-transparent"
                  defaultChecked
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Satellite verification</label>
            <p className="text-sm text-slate-400">Automatically verify reports using Sentinel Hub NDWI/NDVI analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}