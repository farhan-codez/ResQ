# Satellite detection worker

Scheduled worker that turns Sentinel-2 imagery over Ghana into regulator leads.

## What it does

1. Builds cloud-free Sentinel-2 SR composites for the last 30 days and the same
   window one year earlier.
2. Flags areas where NDVI dropped and bare-soil index rose, excluding water.
3. Removes isolated pixels and keeps polygons of at least 3 hectares.
4. Renders a true-colour thumbnail for each lead and uploads it to the
   `detections` Supabase Storage bucket.
5. Upserts the lead into `public.detections` with `status = 'pending_review'`.

Regulators then confirm or dismiss each lead in the app. Confirming creates a
normal complaint that goes through dispatch.

This is a lead generator, not proof. Seasonal clearing, farming, and construction
can look similar, which is why every lead requires review.

## Requirements

- Supabase project with migrations up to `0007_detection_images.sql`.
- A Google Cloud project with the Earth Engine API enabled.
- A service account with Earth Engine access.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `EARTH_ENGINE_PROJECT`, `EE_CLIENT_EMAIL`, `EE_PRIVATE_KEY`

## Local run

```bash
cd workers
npm install
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
EARTH_ENGINE_PROJECT=... \
EE_CLIENT_EMAIL=... \
EE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
npm run dev
```

## Demo run without Earth Engine

Inserts one lead with a real NASA GIBS satellite image so the UI can be checked:

```bash
cd workers
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run demo
```

## Deploy

```bash
cd workers
./deploy.sh <gcp-project-id> <region>
```

The script deploys to Cloud Run and creates a daily Cloud Scheduler job at 03:00.
For production, store `EE_PRIVATE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Secret
Manager and switch the Cloud Run deploy to `--set-secrets`.

## Tuning

| Env | Default | Meaning |
| --- | --- | --- |
| `DETECTION_DAYS` | `30` | Lookback window for the current composite |
| `DETECTION_MAX` | `25` | Maximum leads per run |
| `DETECTION_FORCE` | unset | Ignore the 20 hour cooldown |
| `DETECTION_DEMO` | unset | Insert one demo lead |

Thresholds live in `findDetections()`: NDVI drop `0.18`, bare-soil index `0.12`,
minimum polygon `3 ha`, connected pixels `12`.
