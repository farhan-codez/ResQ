import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase, subscribeToComplaints, isSupabaseConfigured } from '../supabaseClient';
import { Map, Satellite, Activity, AlertTriangle, Globe, Cloud } from 'lucide-react';
import WmsTileLayer from './WmsTileLayer';
import SeverityBadge from './SeverityBadge';

const GHANA_CENTER = [7.9465, -1.0232];
const DEFAULT_ZOOM = 7;

const MARKER_COLORS = {
  low: '#eab308',     // yellow-500
  medium: '#f97316',  // orange-500
  high: '#ef4444',    // red-500
};

const LAYERS = [
  { id: 'street', label: 'Street Map', icon: Map, color: '#eab308' },
  { id: 'satellite', label: 'True Color Satellite', icon: Satellite, color: '#0ea5e9' },
  { id: 'degradation', label: 'Turbidity & Degradation', icon: Activity, color: '#ef4444' },
];

// Sentinel Hub evalscripts (base64-encoded at request time).
const EVALSCRIPTS = {
  trueColor: `//VERSION=3
function setup() {
  return { input: ["B02", "B03", "B04"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  return [sample.B04 * 3.5, sample.B03 * 3.5, sample.B02 * 3.5];
}`,

  degradation: `//VERSION=3
function setup() {
  return { input: ["B02", "B03", "B04", "B08"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  let r = 0, g = 0, b = 0;
  if (ndwi > 0.1) {
    let turbidity = sample.B04 / (sample.B03 + 0.001);
    r = 0.75 + Math.min(turbidity * 0.4, 0.2);
    g = 0.35 + Math.min(ndwi * 0.25, 0.15);
    b = 0.15;
  } else if (ndvi < 0.2) {
    r = 0.7; g = 0.3; b = 0.1;
  } else if (ndvi < 0.5) {
    r = 0.9; g = 0.6; b = 0.1;
  } else {
    r = 0.2; g = 0.5; b = 0.25;
  }
  return [r, g, b];
}`,
};

const instanceId = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID || '';
const sentinelBase = instanceId
  ? `https://services.sentinel-hub.com/ogc/wms/${instanceId}`
  : null;

// Fallback satellite layer (no API key required) when Sentinel Hub is not configured.
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const severityColor = (severity) => MARKER_COLORS[severity] || MARKER_COLORS.medium;

const markerIcon = (severity) => {
  const color = severityColor(severity);
  return L.divIcon({
    className: 'resq-marker',
    html: `
      <div style="
        background:${color};
        width:14px;height:14px;
        border-radius:50%;
        border:2.5px solid #ffffff;
        box-shadow:0 2px 6px rgba(0,0,0,0.5);
        position:relative;
      ">
        <div style="
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:6px;height:6px;background:#ffffff;border-radius:50%;
        "></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

const pulsingMarkerIcon = (severity) => {
  const color = severityColor(severity);
  return L.divIcon({
    className: 'resq-marker pulse',
    html: `
      <div style="
        background:${color};
        width:16px;height:16px;
        border-radius:50%;
        border:2.5px solid #ffffff;
        box-shadow:0 0 0 0 rgba(239,68,68,0.7),0 2px 6px rgba(0,0,0,0.5);
        position:relative;
        animation: markerPulse 2s infinite;
      ">
        <div style="
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:7px;height:7px;background:#ffffff;border-radius:50%;
        "></div>
      </div>
      <style>
        @keyframes markerPulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

export default function MapPanel({ complaints, addComplaint }) {
  const [activeLayer, setActiveLayer] = useState('street');
  const [newAlert, setNewAlert] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);

  // ---- Realtime subscription: add marker + alert on new INSERT ----
  useEffect(() => {
    const unsubscribe = subscribeToComplaints((complaint) => {
      addComplaint(complaint);
      setNewAlert(complaint);
      setToasts((prev) => [...prev, { id: complaint.id, complaint }]);
      // auto-dismiss toast after 8s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== complaint.id));
      }, 8000);
      if (mapInstance) {
        mapInstance.flyTo([complaint.latitude, complaint.longitude], 13);
      }
    });
    return unsubscribe;
  }, [addComplaint, mapInstance]);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const dismissAlert = () => setNewAlert(null);

  const onMapLoad = useCallback((map) => {
    setMapInstance(map);
  }, []);

  const severityBadgeHtml = (severity) => {
    const color = severityColor(severity);
    const label = severity.charAt(0).toUpperCase() + severity.slice(1);
    return `
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
        <strong style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${label}</strong>
      </div>
    `;
  };

  return (
    <div className="w-full h-full relative z-0 flex flex-col">
      {/* Layer control toggle */}
      <div className="layer-control-panel absolute top-4 left-4 z-50">
        <div className="flex flex-col gap-1.5">
          {LAYERS.map((l) => {
            const active = activeLayer === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                className={`layer-btn w-full justify-start ${active ? 'layer-btn-active' : 'layer-btn-inactive'}`}
              >
                <l.icon className={`w-4 h-4 ${active ? 'text-current' : 'text-slate-400'}`} />
                <span className="font-semibold">{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Supabase not configured notice */}
      {!isSupabaseConfigured && (
        <div className="absolute top-4 right-4 z-50 px-3 py-2 rounded-lg bg-amber-900/90 border border-amber-500/40 text-amber-200 text-xs shadow-lg">
          Supabase not configured — demo mode
        </div>
      )}

      <MapContainer
        center={GHANA_CENTER}
        zoom={DEFAULT_ZOOM}
        whenCreated={onMapLoad}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        {/* Standard street map */}
        {activeLayer === 'street' && (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* True color satellite */}
        {activeLayer === 'satellite' && instanceId && (
          <WmsTileLayer
            baseUrl={sentinelBase}
            layers="TRUE_COLOR"
            evalscript={EVALSCRIPTS.trueColor}
            visible
            opacity={0.9}
            attribution="Sentinel-2 True Color"
          />
        )}
        {activeLayer === 'satellite' && !instanceId && (
          <TileLayer
            attribution='&copy; Esri'
            url={ESRI_SATELLITE}
          />
        )}

        {/* Turbidity & vegetation degradation (Sentinel Hub NDWI/NDVI) */}
        {activeLayer === 'degradation' && instanceId && (
          <WmsTileLayer
            baseUrl={sentinelBase}
            layers="TRUE_COLOR"
            evalscript={EVALSCRIPTS.degradation}
            visible
            opacity={0.85}
            attribution="Sentinel Hub NDWI/NDVI"
          />
        )}

        {/* Markers for all complaints */}
        {complaints.map((c) => {
          const isNew = newAlert && newAlert.id === c.id;
          return (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={isNew ? pulsingMarkerIcon(c.severity) : markerIcon(c.severity)}
              eventHandlers={{
                click: () => {
                  // highlight on click handled via popup
                },
              }}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-semibold text-slate-100">{c.title}</h3>
                    <SeverityBadge severity={c.severity} size="lg" />
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2.5">{c.description}</p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Severity:</span>
                      <span className="font-medium">{severityBadgeHtml(c.severity)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-medium ${c.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Satellite:</span>
                      <span className={`font-medium ${c.is_satellite_verified ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {c.is_satellite_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-700/40">
                      <span className="text-slate-500">Reported:</span>
                      <span className="font-mono text-slate-300">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Coords:</span>
                      <span className="font-mono text-slate-300">
                        {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* New report alert indicator */}
      {newAlert && (
        <div className="alert-banner" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-red-100 leading-tight">New {newAlert.severity.toUpperCase()} report</p>
            <p className="text-xs text-red-200/80 leading-tight">{newAlert.title}</p>
          </div>
          <button
            onClick={dismissAlert}
            className="text-red-300 hover:text-white transition-colors ml-2"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toasts for realtime arrivals */}
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast"
          onClick={() => dismissToast(t.id)}
        >
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-water mt-0.5" />
            <div className="text-sm font-semibold text-slate-100">New report received</div>
          </div>
          <div className="text-xs text-slate-400 mt-1">{t.complaint.title}</div>
        </div>
      ))}
    </div>
  );
}