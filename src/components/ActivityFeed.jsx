import { MapPin, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const ICONS = {
  pending: AlertCircle,
  verified: ShieldCheck,
};

export default function ActivityFeed({ complaints }) {
  const sorted = [...complaints].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const relativeTime = (iso) => {
    const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  return (
    <section className="resq-panel p-5 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-water" />
        <h2 className="text-sm font-semibold text-slate-100 tracking-tight uppercase">Live Activity Feed</h2>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
          <MapPin className="w-8 h-8 opacity-50" />
          <p className="text-sm">No reports yet. Be the first to submit.</p>
        </div>
      ) : (
        <div className="overflow-y-auto pr-2 space-y-2.5">
          {sorted.map((c) => (
            <div key={c.id} className="report-card group">
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <h3 className="text-xs font-semibold text-slate-200 truncate group-hover:text-water transition-colors max-w-[70%]">
                  {c.title}
                </h3>
                <span className="text-[10px] text-slate-500">{relativeTime(c.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={c.severity} />
                <span className="ml-auto text-[10px] text-slate-500 flex items-center gap-1">
                  {c.is_satellite_verified ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">satellite-verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">pending</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{c.description}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}