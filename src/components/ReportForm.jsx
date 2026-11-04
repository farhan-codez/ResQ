import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, AlertCircle, Send, X } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function ReportForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const useLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by this browser.');
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        setManualLat(latitude.toFixed(6));
        setManualLng(longitude.toFixed(6));
      },
      (err) => {
        setGeoError('Location access denied. You can enter coordinates manually below.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    let latitude, longitude;
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      latitude = parseFloat(manualLat);
      longitude = parseFloat(manualLng);
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        setGeoError('Please capture your location or enter valid coordinates.');
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('complaints').insert([
        {
          title: title.trim(),
          description: description.trim(),
          latitude,
          longitude,
          severity,
        },
      ]);
      if (error) throw error;

      onSuccess?.();
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setCoords(null);
      setManualLat('');
      setManualLng('');
      setGeoError(null);
    } catch (err) {
      alert(`Failed to submit report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="resq-panel p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <h2 className="text-sm font-semibold text-slate-100 tracking-tight uppercase">Emergency Report</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5 font-medium">Report Title</label>
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-water transition-all placeholder-slate-500"
            placeholder="e.g. Illegal dredging on Pra River"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5 font-medium">Description</label>
          <textarea
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-water transition-all placeholder-slate-500"
            rows={3}
            placeholder="What do you see? (equipment, people, water color, damage...)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Severity Level</label>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => setSeverity(s.value)}
                className={`severity-badge ${severity === s.value ? 'bg-slate-800 border-slate-600 text-white shadow-[0_0_10px_rgba(148,163,184,0.25)]' : CLASSES[s.value]} flex items-center justify-center gap-1.5`}
              >
                <span className={`w-3 h-3 rounded-full ${severity === s.value ? 'bg-current' : 'bg-slate-600'}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={useLocation}
              disabled={loading}
              className="flex items-center gap-2 w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <MapPin className="w-4 h-4" />
              {coords ? 'Location captured' : 'Use my location'}
            </button>
            {coords && (
              <button
                type="button"
                onClick={() => setCoords(null)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {coords && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
          )}
          {!coords && geoError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> {geoError}
            </p>
          )}
          <div className="pt-2 border-t border-slate-800/50">
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Manual coordinates (override)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-water"
                placeholder="Lat"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <input
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-water"
                placeholder="Lng"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim()}
          className={`w-full bg-water hover:bg-cyan-500 text-white font-bold text-sm py-3 rounded-lg shadow-[0_0_20px_rgba(14,165,233,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-wider`}
        >
          <Send className="w-4 h-4" />
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </section>
  );
}