#!/usr/bin/env node
/**
 * Earth Engine Detection Worker
 * 
 * This script runs periodically (e.g., via cron) to:
 * 1. Query Sentinel-2 for new galamsey-like changes
 * 2. Insert detections into Supabase
 * 3. Optionally trigger regulator notifications
 * 
 * Requires:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
 * - Google Earth Engine credentials (ee.Initialize)
 * 
 * For now this is a scaffold — replace with real EE logic.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

interface DetectionInput {
  name: string
  detectedAt: string // ISO string
  confidence: number // 0-1
  areaHa: number
  points: [number, number][]
}

/**
 * Generate a detection ID like S2-XXXX
 */
function newDetectionId(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1))[0]
  const num = bytes.toString(36).toUpperCase().padStart(4, '0').slice(0, 4)
  return `S2-${num}`
}

/**
 * Mock: replace with actual Earth Engine query
 * Returns a list of new detections since last run
 */
async function fetchNewDetections(): Promise<DetectionInput[]> {
  // TODO: Replace with real Earth Engine logic
  // const image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  //   .filterDate(lastRun, new Date())
  //   .filterBounds(ghanaGeometry)
  //   .map(computeNDVIChange)
  //   .reduce(ee.Reducer.max())
  //   .reduceToVectors(...)

  console.log('[worker] Earth Engine query would run here')
  return []
}

/**
 * Insert detections into Supabase
 */
async function insertDetections(detections: DetectionInput[]) {
  if (!detections.length) return

  const rows = detections.map((d) => ({
    id: newDetectionId(),
    name: d.name,
    detected_at: d.detectedAt,
    confidence: d.confidence,
    area_ha: d.areaHa,
    points: d.points,
    status: 'pending_review', // pending_review | confirmed | dismissed
  }))

  const { error } = await supabase.from('detections').upsert(rows, { onConflict: 'id' })
  if (error) throw error

  console.log(`[worker] Inserted ${rows.length} detections`)
  return rows
}

/**
 * Main worker entry point
 */
async function main() {
  console.log('[worker] Starting detection run', new Date().toISOString())

  try {
    const detections = await fetchNewDetections()
    await insertDetections(detections)
    console.log('[worker] Done')
  } catch (e) {
    console.error('[worker] Error:', e)
    process.exit(1)
  }
}

main()