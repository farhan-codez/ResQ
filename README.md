# ResQ — Galamsey & Water Pollution Reporting MVP

Real-time community reporting dashboard to curb illegal mining (Galamsey) and water pollution in Ghana.

- **Split-screen dashboard**: emergency report form + live activity feed (left, 35%) • fullscreen geospatial map (right, 65%)
- **Browser geolocation** capture via `navigator.geolocation`, severity-coded map markers (Red/Orange/Yellow)
- **Satellite overlays**: Street Map (OSM) • True Color (Sentinel-2) • Turbidity & Vegetation Degradation (Sentinel Hub WMS with NDWI/NDVI evalscripts over the Pra, Ankobra, and Birim basins)
- **Supabase backend** with realtime `postgres_changes` subscriptions — new reports appear on the map without refresh

## Stack
React 18 · Vite · Tailwind CSS · Lucide React · React-Leaflet · Leaflet · Supabase JS

## Setup

```bash
cp .env.example .env   # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

1. Run `supabase/migrations/0001_create_complaints.sql` in your Supabase project SQL editor.
2. Enable Realtime for the `complaints` table (Supabase → Database → Replication).
3. Start the dev server and submit reports — markers appear live on the map.

## License
MIT