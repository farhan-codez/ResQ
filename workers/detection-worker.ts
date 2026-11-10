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
 * - GOOGLE_APPLICATION_CREDENTIALS or EE_PRIVATE_KEY env vars for Earth Engine
 * - EARTH_ENGINE_PROJECT env var
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EE_PROJECT = process.env.EARTH_ENGINE_PROJECT
const EE_PRIVATE_KEY = process.env.EE_PRIVATE_KEY
const EE_CLIENT_EMAIL = process.env.EE_CLIENT_EMAIL

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

interface WorkerState {
  last_run: string
  processed_count: number
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
 * Get or create worker state (last run timestamp)
 */
async function getWorkerState(): Promise<WorkerState> {
  const { data, error } = await supabase
    .from('worker_state')
    .select('*')
    .eq('worker_name', 'detection-worker')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error

  if (!data) {
    // Create initial state
    const { data: newState, error: insertError } = await supabase
      .from('worker_state')
      .insert({
        worker_name: 'detection-worker',
        last_run: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        processed_count: 0,
      })
      .select()
      .single()
    if (insertError) throw insertError
    return newState as WorkerState
  }

  return data as WorkerState
}

/**
 * Update worker state after successful run
 */
async function updateWorkerState(state: Partial<WorkerState>): Promise<void> {
  const { error } = await supabase
    .from('worker_state')
    .upsert({
      worker_name: 'detection-worker',
      ...state,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

/**
 * Initialize Earth Engine client
 */
async function initEarthEngine(): Promise<any> {
  if (!EE_PROJECT || !EE_PRIVATE_KEY || !EE_CLIENT_EMAIL) {
    console.warn('[worker] Earth Engine credentials not configured, skipping EE initialization')
    return null
  }

  try {
    // This is a placeholder - actual EE initialization would use @google/earthengine
    // For now, we'll use the REST API approach
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: EE_CLIENT_EMAIL,
        private_key: EE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/earthengine'],
    })

    const client = await auth.getClient()
    console.log('[worker] Earth Engine auth initialized')
    return client
  } catch (e) {
    console.error('[worker] Failed to initialize Earth Engine:', e)
    return null
  }
}

/**
 * Query Earth Engine for new detections
 * Returns a list of new detections since last run
 */
async function fetchNewDetections(lastRun: string, eeClient: any): Promise<DetectionInput[]> {
  if (!eeClient) {
    console.log('[worker] Earth Engine client not available, returning mock data')
    // Return mock data for testing
    return [
      {
        name: 'Pra River corridor - new activity',
        detectedAt: new Date().toISOString(),
        confidence: 0.87,
        areaHa: 45.2,
        points: [[5.72, -1.51], [5.73, -1.50], [5.71, -1.49], [5.70, -1.52]],
      },
    ]
  }

  try {
    // TODO: Replace with actual Earth Engine REST API calls
    // const response = await eeClient.request({
    //   url: `https://earthengine.googleapis.com/v1/projects/${EE_PROJECT}:runAlgorithm`,
    //   method: 'POST',
    //   data: {
    //     algorithm: 'sentinel2.changeDetection',
    //     params: {
    //       startDate: lastRun,
    //       endDate: new Date().toISOString(),
    //       region: 'ghana',
    //       thresholds: { ndvi: -0.3, nbr: -0.25 },
    //     },
    //   })

    console.log('[worker] Earth Engine query would run here for period:', lastRun, 'to', new Date().toISOString())
    return []
  } catch (e) {
    console.error('[worker] Earth Engine query failed:', e)
    return []
  }
}

/**
 * Insert detections into Supabase
 */
async function insertDetections(detections: DetectionInput[]): Promise<number> {
  if (!detections.length) return 0

  const rows = detections.map((d) => ({
    id: newDetectionId(),
    name: d.name,
    detected_at: d.detectedAt,
    confidence: d.confidence,
    area_ha: d.areaHa,
    points: d.points,
    status: 'pending_review',
  }))

  const { error } = await supabase.from('detections').upsert(rows, { onConflict: 'id' })
  if (error) throw error

  console.log(`[worker] Inserted ${rows.length} detections`)
  return rows.length
}

/**
 * Main worker entry point
 */
async function main() {
  console.log('[worker] Starting detection run', new Date().toISOString())

  try {
    // Initialize Earth Engine
    const eeClient = await initEarthEngine()

    // Get last run state
    const state = await getWorkerState()
    console.log('[worker] Last run:', state.last_run)

    // Fetch new detections
    const detections = await fetchNewDetections(state.last_run, eeClient)

    // Insert detections
    const count = await insertDetections(detections)

    // Update state
    await updateWorkerState({
      last_run: new Date().toISOString(),
      processed_count: state.processed_count + count,
    })

    console.log('[worker] Done. Processed:', count)
  } catch (e) {
    console.error('[worker] Error:', e)
    process.exit(1)
  }
}

main()