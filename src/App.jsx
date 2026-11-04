import { useState, useCallback, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ReportForm from './components/ReportForm';
import ActivityFeed from './components/ActivityFeed';
import MapPanel from './components/MapPanel';

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch existing complaints on mount
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

    if (supabase) {
      fetchComplaints();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const addComplaint = useCallback((complaint) => {
    setComplaints((prev) => {
      const exists = prev.some((c) => c.id === complaint.id);
      if (exists) return prev;
      return [complaint, ...prev];
    });
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-resq-deep flex flex-col md:flex-row">
      {/* Left Panel: 35% — Report Form + Activity Feed */}
      <section className="w-full md:w-[35%] h-full overflow-y-auto border-r border-slate-800 z-10 flex flex-col">
        <div className="sticky top-0 bg-resq-deep/95 backdrop-blur border-b border-slate-800 z-20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
            <span className="text-xs font-bold text-red-300 tracking-wider uppercase">LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-water to-cyan-600 flex items-center justify-center text-[10px] font-bold shadow-[0_0_12px_rgba(14,165,233,0.5)]">
              R
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-tight">ResQ</h1>
              <p className="text-[10px] text-slate-400">Galamsey &amp; Water Watch</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1 min-h-0">
          <ReportForm onSuccess={() => {}} />
          <ActivityFeed complaints={complaints} />
        </div>
      </section>

      {/* Right Panel: 65% — Fullscreen Map */}
      <section className="w-full md:w-[65%] h-full relative z-0">
        <MapPanel complaints={complaints} addComplaint={addComplaint} />
      </section>
    </div>
  );
}