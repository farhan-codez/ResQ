#!/usr/bin/env node
/**
 * ResQ satellite detection worker.
 *
 * Runs on a schedule and:
 * 1. Builds cloud-free Sentinel-2 composites over Ghana with Earth Engine.
 * 2. Flags vegetation loss + bare-soil increase as candidate galamsey leads.
 * 3. Renders a true-colour thumbnail for each lead and uploads it to Supabase Storage.
 * 4. Inserts the lead into public.detections for regulator review.
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   EARTH_ENGINE_PROJECT, EE_CLIENT_EMAIL, EE_PRIVATE_KEY
 *
 * Optional:
 *   DETECTION_DAYS=30          lookback window for the current composite
 *   DETECTION_MAX=25           maximum leads per run
 *   DETECTION_FORCE=1          ignore the 20 hour cooldown
 *   DETECTION_DEMO=1           insert one demo lead with a NASA GIBS image
 */

import { createClient } from '@supabase/supabase-js'

// Earth Engine ships CommonJS without types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ee = require('@google/earthengine') as any

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EE_PROJECT = process.env.EARTH_ENGINE_PROJECT
const EE_PRIVATE_KEY = process.env.EE_PRIVATE_KEY
const EE_CLIENT_EMAIL = process.env.EE_CLIENT_EMAIL

const LOOKBACK_DAYS = Number(process.env.DETECTION_DAYS || 30)
const MAX_DETECTIONS = Number(process.env.DETECTION_MAX || 25)
const FORCE = process.env.DETECTION_FORCE === '1'
const DEMO = process.env.DETECTION_DEMO === '1' || process.argv.includes('--demo')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

interface DetectionInput {
  id: string
  name: string
  region: string
  detectedAt: string
  confidence: number
  areaHa: number
  points: [number, number][]
  imageUrl?: string
}

interface WorkerState {
  last_run: string
  processed_count: number
}

function detectionId(lat: number, lon: number, date: Date): string {
  const key = `${lat.toFixed(2)}:${lon.toFixed(2)}:${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return `S2-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}

async function getWorkerState(): Promise<WorkerState> {
  const { data, error } = await supabase
    .from('worker_state')
    .select('*')
    .eq('worker_name', 'detection-worker')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  if (data) return data as WorkerState

  const initial = {
    worker_name: 'detection-worker',
    last_run: new Date(0).toISOString(),
    processed_count: 0,
  }
  const { data: created, error: insertError } = await supabase
    .from('worker_state')
    .insert(initial)
    .select()
    .single()
  if (insertError) throw insertError
  return created as WorkerState
}

async function updateWorkerState(state: Partial<WorkerState>): Promise<void> {
  const { error } = await supabase.from('worker_state').upsert({
    worker_name: 'detection-worker',
    ...state,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

function initEarthEngine(): Promise<void> {
  if (!EE_PROJECT || !EE_PRIVATE_KEY || !EE_CLIENT_EMAIL) {
    return Promise.reject(new Error('Earth Engine credentials are not configured'))
  }

  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      {
        client_email: EE_CLIENT_EMAIL,
        private_key: EE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      () => {
        ee.initialize(
          null,
          null,
          () => resolve(),
          (err: unknown) => reject(err),
          EE_PROJECT,
        )
      },
      (err: unknown) => reject(err),
    )
  })
}

function maskS2(image: any) {
  // Keep vegetation, bare soil, water and unclassified clear pixels. Drop cloud shadow and clouds.
  const scl = image.select('SCL')
  const clear = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(11))
  return image.updateMask(clear).divide(10000)
}

function addIndices(image: any) {
  const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
  const bsi = image
    .expression('((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))', {
      B11: image.select('B11'),
      B4: image.select('B4'),
      B8: image.select('B8'),
      B2: image.select('B2'),
    })
    .rename('BSI')
  return image.addBands([ndvi, ndwi, bsi])
}

function composite(collection: any, start: Date, end: Date) {
  return collection
    .filterDate(start.toISOString(), end.toISOString())
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
    .map(maskS2)
    .map(addIndices)
    .median()
}

async function findDetections(): Promise<DetectionInput[]> {
  const now = new Date()
  const currentStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const baselineStart = new Date(currentStart)
  baselineStart.setFullYear(baselineStart.getFullYear() - 1)
  const baselineEnd = new Date(now)
  baselineEnd.setFullYear(baselineEnd.getFullYear() - 1)

  const ghana = ee.FeatureCollection('FAO/GAUL/2015/level0').filter(ee.Filter.eq('ADM0_NAME', 'Ghana'))
  const regions = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM0_NAME', 'Ghana'))

  const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(ghana)
  const current = composite(collection, currentStart, now)
  const baseline = composite(collection, baselineStart, baselineEnd)

  const ndviDrop = baseline.select('NDVI').subtract(current.select('NDVI')).rename('NDVI_DROP')
  const water = current.select('NDWI').gt(0.1)
  const change = ndviDrop
    .gt(0.18)
    .and(current.select('BSI').gt(0.12))
    .and(current.select('NDVI').lt(0.45))
    .and(water.not())
    .rename('CHANGE')

  // Remove isolated pixels so a single bad pixel does not become a lead.
  const connected = change.connectedPixelCount(30, true)
  const cleaned = change.updateMask(connected.gte(12)).selfMask()

  const vectors = cleaned.reduceToVectors({
    geometry: ghana.geometry(),
    scale: 20,
    geometryType: 'polygon',
    eightConnected: true,
    labelProperty: 'change',
    maxPixels: 1e9,
  })

  const leads = vectors
    .map((feature: any) => {
      const areaHa = feature.geometry().area().divide(10000)
      const region = regions.filterBounds(feature.geometry()).first().get('ADM1_NAME')
      const meanDrop = ndviDrop.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: feature.geometry(),
        scale: 20,
        maxPixels: 1e8,
      })
      return feature.set({
        area_ha: areaHa,
        region,
        mean_drop: meanDrop.get('NDVI_DROP'),
      })
    })
    .filter(ee.Filter.gte('area_ha', 3))
    .limit(MAX_DETECTIONS)

  const info = await leads.getInfo()
  const features = info?.features ?? []
  const detections: DetectionInput[] = []

  for (const feature of features) {
    const geometry = feature.geometry
    if (!geometry || geometry.type !== 'Polygon') continue
    const ring: number[][] = geometry.coordinates[0]
    // Leaflet and the app use [lat, lon]; GeoJSON uses [lon, lat].
    const points = ring.map(([lon, lat]) => [lat, lon] as [number, number])
    const centroid = points.reduce(
      (acc, [lat, lon]) => [acc[0] + lat / points.length, acc[1] + lon / points.length],
      [0, 0],
    ) as [number, number]
    const areaHa = Number(feature.properties?.area_ha ?? 0)
    const meanDrop = Number(feature.properties?.mean_drop ?? 0.2)
    const confidence = Math.max(0.55, Math.min(0.95, 0.55 + meanDrop * 1.1))
    const region = String(feature.properties?.region ?? 'Ghana')
    const id = detectionId(centroid[0], centroid[1], now)

    let imageUrl: string | undefined
    try {
      const thumb = current.select(['B4', 'B3', 'B2']).visualize({ min: 0.02, max: 0.35 })
      const url = thumb.getThumbURL({
        region: ee.Geometry.Polygon(ring).bounds().buffer(1000),
        dimensions: 512,
        format: 'png',
      })
      imageUrl = await uploadImage(id, url, 'image/png')
    } catch (e) {
      console.warn(`[worker] Thumbnail failed for ${id}:`, e)
    }

    detections.push({
      id,
      name: `Vegetation loss near ${region}`,
      region,
      detectedAt: now.toISOString(),
      confidence: Number(confidence.toFixed(2)),
      areaHa: Number(areaHa.toFixed(1)),
      points,
      imageUrl,
    })
  }

  return detections
}

async function uploadImage(id: string, url: string, contentType: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Image download failed (${res.status})`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png'
  const path = `${id}.${ext}`
  const { error } = await supabase.storage.from('detections').upload(path, bytes, {
    contentType,
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('detections').getPublicUrl(path).data.publicUrl
}

function demoDetection(): DetectionInput {
  const lat = 5.72
  const lon = -1.51
  const now = new Date()
  const pad = 0.02
  const points: [number, number][] = [
    [lat - pad, lon - pad],
    [lat - pad, lon + pad],
    [lat + pad, lon + pad],
    [lat + pad, lon - pad],
  ]
  const date = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const gibs =
    'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi' +
    '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1' +
    '&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&STYLES=&FORMAT=image/jpeg' +
    '&TRANSPARENT=FALSE&HEIGHT=512&WIDTH=512&SRS=EPSG:4326' +
    `&BBOX=${lon - 0.08},${lat - 0.08},${lon + 0.08},${lat + 0.08}` +
    `&TIME=${date}`
  return {
    id: detectionId(lat, lon, now),
    name: 'Vegetation loss near Pra River',
    region: 'Western',
    detectedAt: now.toISOString(),
    confidence: 0.84,
    areaHa: 42.5,
    points,
    imageUrl: gibs,
  }
}

async function insertDetections(detections: DetectionInput[]): Promise<number> {
  if (!detections.length) return 0

  const rows = []
  for (const d of detections) {
    let imageUrl = d.imageUrl
    // Demo images come from NASA GIBS; copy them into our bucket so the lead owns its image.
    if (DEMO && imageUrl) {
      try {
        imageUrl = await uploadImage(d.id, imageUrl, 'image/jpeg')
      } catch (e) {
        console.warn('[worker] Demo image upload failed:', e)
      }
    }
    rows.push({
      id: d.id,
      name: d.name,
      detected_at: d.detectedAt,
      confidence: d.confidence,
      area_ha: d.areaHa,
      points: d.points,
      status: 'pending_review',
      image_url: imageUrl ?? null,
      source: 'sentinel-2',
      region: d.region,
    })
  }

  const { error } = await supabase.from('detections').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  console.log(`[worker] Upserted ${rows.length} detection(s)`)
  return rows.length
}

async function main() {
  console.log('[worker] Starting detection run', new Date().toISOString())
  const state = await getWorkerState()

  const hoursSinceLastRun = (Date.now() - new Date(state.last_run).getTime()) / 36e5
  if (!FORCE && !DEMO && hoursSinceLastRun < 20) {
    console.log(`[worker] Last run was ${hoursSinceLastRun.toFixed(1)}h ago, skipping`)
    return
  }

  let detections: DetectionInput[]
  if (DEMO) {
    console.log('[worker] Demo mode: inserting one lead with a NASA GIBS image')
    detections = [demoDetection()]
  } else {
    await initEarthEngine()
    detections = await findDetections()
  }

  const count = await insertDetections(detections)
  await updateWorkerState({
    last_run: new Date().toISOString(),
    processed_count: state.processed_count + count,
  })
  console.log(`[worker] Done. Processed ${count} lead(s)`)
}

main().catch((e) => {
  console.error('[worker] Error:', e)
  process.exit(1)
})
