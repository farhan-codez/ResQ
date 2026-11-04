# ResQ — Galamsey & Water Pollution Reporting MVP

Real-time community reporting dashboard to curb illegal mining (Galamsey) and water pollution in Ghana.

## Features
- **Auth**: Login / register / guest access (persisted in localStorage, ready to wire to Supabase Auth)
- **Split-screen dashboard**: emergency report form + live activity feed (left) • fullscreen geospatial map (right)
- **Browser geolocation** via `navigator.geolocation`, severity-coded map markers (Red/Orange/Yellow)
- **Satellite overlays**: Street Map (OSM) • True Color (Sentinel-2) • Turbidity & Vegetation Degradation (Sentinel Hub WMS NDWI/NDVI over Pra, Ankobra, Birim basins)
- **Supabase realtime**: `.on('postgres_changes', ...)` — new reports push markers to the map instantly, no refresh
- **Beautiful UI**: dark ops-theme, glass panels, Lucide icons, Tailwind, responsive sidebar/header

## Stack
React 18 · Vite · Tailwind CSS · Lucide React · React-Leaflet · Leaflet · React Router · Supabase JS

## Setup
```bash
cd ResQ
npm install
cp .env.example .env   # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

1. Run `supabase/migrations/0001_create_complaints.sql` in your Supabase SQL editor.
2. Enable Realtime for `public.complaints` (Database → Replication).
3. Open `http://localhost:5173` — sign in, submit a report, watch the marker appear live.

## Pages
- `/` — Login
- `/register` — Create account
- `/dashboard` — Split-screen map + report form + activity feed
- `/report` — Dedicated report submission
- `/reports` — Full activity feed
- `/satellite` — Satellite layer info
- `/settings` — App settings

## License
MIT