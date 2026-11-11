import type { Detection, Report, Role, Severity, Status, Category } from './types'

const H = 3600_000
const D = 24 * H
const now = Date.now()

export const PHOTOS = {
  pit: 'https://images.unsplash.com/photo-1647969476632-17261bc91afa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  quarry: 'https://images.unsplash.com/photo-1571223641822-b82408a0e705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  river: 'https://images.unsplash.com/photo-1665020275904-a914507eaf68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  forest: 'https://images.unsplash.com/photo-1655487880850-b16ba0e58c65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
}

export const LOGIN_POSTER =
  'https://images.unsplash.com/photo-1740447342649-8b68b10b42d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920'

/** Replace with the supplied background video URL. Leave empty to show the poster image. */
export const LOGIN_VIDEO_SRC = ''

export const TEAMS = [
  'Minerals Commission Task Force, Western',
  'Operation Halt II, Ashanti',
  'EPA Field Unit, Eastern',
  'Forestry Commission Rapid Response',
]

interface Seed {
  title: string
  description: string
  category: Category
  severity: Severity
  status: Status
  lat: number
  lng: number
  place: string
  region: string
  ago: number
  photos?: string[]
  anonymous?: boolean
  reporter?: string
  team?: string
}

const seeds: Seed[] = [
  {
    title: 'Excavators dredging the Pra River bank',
    description:
      'Two excavators and a changfan dredge working on the east bank since early morning. Water downstream has turned brown. About 15 workers on site.',
    category: 'galamsey',
    severity: 'high',
    status: 'investigating',
    lat: 5.612,
    lng: -1.548,
    place: 'Twifo Praso',
    region: 'Central',
    ago: 2 * H,
    photos: [PHOTOS.river, PHOTOS.pit],
    reporter: 'Kwame Asante',
    team: 'Minerals Commission Task Force, Western',
  },
  {
    title: 'New pits dug beside Offin River',
    description:
      'Several fresh pits, roughly 4 m deep, opened along the river within the last week. Pumps running at night. Farmland on both sides is cleared.',
    category: 'galamsey',
    severity: 'high',
    status: 'pending',
    lat: 5.962,
    lng: -1.779,
    place: 'Dunkwa-on-Offin',
    region: 'Central',
    ago: 38 * 60_000,
    photos: [PHOTOS.pit],
    anonymous: true,
  },
  {
    title: 'Mercury use reported near Birim tributary',
    description:
      'Residents report people washing gold with mercury near the footbridge. Children swim downstream. Smell of chemicals in the evening.',
    category: 'water_pollution',
    severity: 'medium',
    status: 'investigating',
    lat: 6.168,
    lng: -0.553,
    place: 'Kyebi',
    region: 'Eastern',
    ago: 9 * H,
    reporter: 'Akosua Boateng',
    team: 'EPA Field Unit, Eastern',
  },
  {
    title: 'Mining camp inside Ankobra floodplain',
    description:
      'A camp with tents and generators has been set up on the floodplain. Heavy trucks moving in and out via the Prestea road.',
    category: 'galamsey',
    severity: 'high',
    status: 'pending',
    lat: 5.432,
    lng: -2.142,
    place: 'Prestea',
    region: 'Western',
    ago: 5 * H,
    photos: [PHOTOS.quarry],
    reporter: 'Yaw Owusu',
  },
  {
    title: 'Abandoned pits left open',
    description:
      'Old pits left uncovered near the junction. They fill with water when it rains and are a drowning risk for children walking to school.',
    category: 'galamsey',
    severity: 'medium',
    status: 'resolved',
    lat: 5.302,
    lng: -1.992,
    place: 'Tarkwa',
    region: 'Western',
    ago: 6 * D,
    reporter: 'Esi Quaye',
    team: 'Minerals Commission Task Force, Western',
  },
  {
    title: 'Small-scale panning at stream crossing',
    description: 'Three people panning at the stream crossing. No machinery seen.',
    category: 'galamsey',
    severity: 'low',
    status: 'resolved',
    lat: 6.204,
    lng: -1.668,
    place: 'Obuasi',
    region: 'Ashanti',
    ago: 11 * D,
    anonymous: true,
  },
  {
    title: 'Forest clearing in Atewa reserve',
    description:
      'Chainsaws heard and a cleared strip visible from the ridge path. Looks like preparation for a new site inside the reserve boundary.',
    category: 'galamsey',
    severity: 'high',
    status: 'investigating',
    lat: 6.231,
    lng: -0.585,
    place: 'Atewa Range',
    region: 'Eastern',
    ago: 26 * H,
    photos: [PHOTOS.forest],
    reporter: 'Kofi Adjei',
    team: 'Forestry Commission Rapid Response',
  },
  {
    title: 'Washing plant discharging into stream',
    description: 'Muddy discharge pipe running from a washing plant straight into the stream behind the market.',
    category: 'water_pollution',
    severity: 'medium',
    status: 'pending',
    lat: 6.042,
    lng: -0.801,
    place: 'Akwatia',
    region: 'Eastern',
    ago: 3 * H,
    reporter: 'Abena Darko',
  },
  {
    title: 'Suspicious equipment on cocoa farm',
    description: 'A water pump and sluice box left on a cocoa farm. Owner says he did not give permission.',
    category: 'galamsey',
    severity: 'low',
    status: 'pending',
    lat: 6.463,
    lng: -2.318,
    place: 'Bibiani',
    region: 'Western North',
    ago: 2 * D,
    anonymous: true,
  },
  {
    title: 'Dredging boats on the Offin',
    description: 'Four dredging boats operating in the main channel. River is visibly wider and shallower than last season.',
    category: 'galamsey',
    severity: 'medium',
    status: 'pending',
    lat: 6.468,
    lng: -1.884,
    place: 'Manso Nkwanta',
    region: 'Ashanti',
    ago: 14 * H,
    reporter: 'Kojo Mensah',
  },
  {
    title: 'Land cleared next to school field',
    description: 'Topsoil removed on a plot next to the school field. Workers said they are testing for gold.',
    category: 'galamsey',
    severity: 'low',
    status: 'investigating',
    lat: 5.792,
    lng: -2.071,
    place: 'Wassa Akropong',
    region: 'Western',
    ago: 3 * D,
    reporter: 'Adwoa Sarpong',
    team: 'Minerals Commission Task Force, Western',
  },
  {
    title: 'Pits restored after enforcement',
    description: 'Site reported last month has been backfilled. Reporting so the record shows it was resolved.',
    category: 'galamsey',
    severity: 'medium',
    status: 'resolved',
    lat: 5.568,
    lng: -2.011,
    place: 'Bogoso',
    region: 'Western',
    ago: 18 * D,
    reporter: 'Nana Yeboah',
    team: 'Minerals Commission Task Force, Western',
  },
  {
    title: 'Night activity at river bend',
    description: 'Lights and engine noise at the river bend every night this week, from about 10 pm.',
    category: 'galamsey',
    severity: 'low',
    status: 'pending',
    lat: 6.617,
    lng: -1.214,
    place: 'Konongo',
    region: 'Ashanti',
    ago: 20 * H,
    anonymous: true,
  },
  {
    title: 'Large excavation near Tano River',
    description:
      'A large open pit with three excavators. Water is being pumped into the Tano River. The site was not here two weeks ago.',
    category: 'galamsey',
    severity: 'high',
    status: 'pending',
    lat: 5.812,
    lng: -2.428,
    place: 'Asankragwa',
    region: 'Western',
    ago: 70 * 60_000,
    photos: [PHOTOS.pit, PHOTOS.quarry],
    reporter: 'Efua Ansah',
  },
]

export const INITIAL_REPORTS: Report[] = seeds.map((s, i) => {
  const createdAt = now - s.ago
  const id = `RQ-${(2481 - i * 7).toString()}`
  const reporterName = s.anonymous ? 'Anonymous' : (s.reporter ?? 'Citizen')
  const timeline = [{ id: `${id}-t0`, at: createdAt, label: 'Report submitted', by: reporterName, status: 'pending' as Status }]
  if (s.status !== 'pending') {
    const t1 = createdAt + Math.min(s.ago * 0.3, 6 * H)
    timeline.push({ id: `${id}-t1`, at: t1, label: `Assigned to ${s.team ?? 'Regional team'}`, by: 'Regulator desk', status: 'investigating' })
  }
  if (s.status === 'resolved') {
    timeline.push({ id: `${id}-t2`, at: createdAt + s.ago * 0.8, label: 'Site visited, activity stopped', by: s.team ?? 'Regional team', status: 'resolved' })
  }
  return {
    id,
    title: s.title,
    description: s.description,
    category: s.category,
    severity: s.severity,
    status: s.status,
    lat: s.lat,
    lng: s.lng,
    place: s.place,
    region: s.region,
    createdAt,
    photos: s.photos ?? [],
    reporter: { name: reporterName, anonymous: !!s.anonymous },
    assignedTeam: s.status !== 'pending' ? s.team : undefined,
    timeline,
  }
})

/** Irregular blob shaped polygon to stand in for a Sentinel-2 change detection. */
function blob(lat: number, lng: number, rLat: number, rLng: number, seed: number, angle = 0): [number, number][] {
  const pts: [number, number][] = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const wobble = 0.72 + 0.28 * Math.sin(seed * 3.1 + i * 1.7) * Math.cos(seed + i * 0.9)
    const x = Math.cos(t) * rLng * wobble
    const y = Math.sin(t) * rLat * wobble
    const xr = x * Math.cos(angle) - y * Math.sin(angle)
    const yr = x * Math.sin(angle) + y * Math.cos(angle)
    pts.push([lat + yr, lng + xr])
  }
  return pts
}

export const DETECTIONS: Detection[] = [
  { id: 'S2-0912', name: 'Pra River corridor', detectedAt: now - 3 * D, confidence: 0.91, areaHa: 182.4, points: blob(5.7, -1.5, 0.13, 0.05, 1, 0.6), status: 'pending_review', region: 'Western Region', source: 'Sentinel-2' },
  { id: 'S2-0907', name: 'Offin River, Dunkwa', detectedAt: now - 5 * D, confidence: 0.88, areaHa: 146.1, points: blob(6.06, -1.76, 0.14, 0.045, 2, 0.3), status: 'pending_review', region: 'Central Region', source: 'Sentinel-2' },
  { id: 'S2-0899', name: 'Ankobra floodplain', detectedAt: now - 8 * D, confidence: 0.84, areaHa: 97.8, points: blob(5.5, -2.2, 0.11, 0.045, 3, -0.4), status: 'pending_review', region: 'Western Region', source: 'Sentinel-2' },
  { id: 'S2-0894', name: 'Birim basin, Kyebi', detectedAt: now - 9 * D, confidence: 0.79, areaHa: 64.3, points: blob(6.08, -0.66, 0.08, 0.06, 4, 0.9), status: 'pending_review', region: 'Eastern Region', source: 'Sentinel-2' },
  { id: 'S2-0881', name: 'Tano River, Asankragwa', detectedAt: now - 12 * D, confidence: 0.86, areaHa: 121.7, points: blob(5.92, -2.38, 0.12, 0.05, 5, -0.2), status: 'pending_review', region: 'Western North Region', source: 'Sentinel-2' },
  { id: 'S2-0876', name: 'Amansie West', detectedAt: now - 14 * D, confidence: 0.73, areaHa: 58.9, points: blob(6.36, -1.95, 0.07, 0.06, 6, 0.1), status: 'pending_review', region: 'Ashanti Region', source: 'Sentinel-2' },
]

export const DEFAULT_LOCATION = { lat: 6.1652, lng: -0.5518, place: 'Kyebi, Eastern Region' }

export const GHANA_CENTER: [number, number] = [6.0, -1.45]