import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { INITIAL_REPORTS } from './data'
import type { Report, Role, Status } from './types'
import { supabase, isSupabaseConfigured, complaintToReport } from './supabaseClient'

export type Route =
  | { name: 'library' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'dashboard'; incident?: string; focus?: string }
  | { name: 'reports'; incident?: string }

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(query)
  const parts = path.split('/').filter(Boolean)
  switch (parts[0]) {
    case 'library':
      return { name: 'library' }
    case 'login':
      return { name: 'login' }
    case 'signup':
      return { name: 'signup' }
    case 'reports':
      return { name: 'reports', incident: params.get('incident') ?? undefined }
    case 'dashboard':
      return { name: 'dashboard', incident: params.get('incident') ?? undefined, focus: params.get('focus') ?? undefined }
    default:
      return { name: 'login' }
  }
}

export function routeToHash(r: Route) {
  const q = new URLSearchParams()
  if ('incident' in r && r.incident) q.set('incident', r.incident)
  if ('focus' in r && r.focus) q.set('focus', r.focus)
  const qs = q.toString()
  return `#/${r.name}${qs ? `?${qs}` : ''}`
}

export type Theme = 'light' | 'dark'

interface AppState {
  route: Route
  navigate: (r: Route) => void
  theme: Theme
  setTheme: (t: Theme) => void
  role: Role
  setRole: (r: Role) => void
  reports: Report[]
  addReport: (r: Report) => void
  updateStatus: (id: string, status: Status) => void
  assignTeam: (id: string, team: string) => void
  simulateFailure: boolean
  setSimulateFailure: (v: boolean) => void
  emptyData: boolean
  setEmptyData: (v: boolean) => void
  embedded: boolean
  user: { name: string; email: string }
}

const Ctx = createContext<AppState | null>(null)

const SEED_IDS = new Set(INITIAL_REPORTS.map((r) => r.id))

const search = new URLSearchParams(window.location.search)
const embedded = search.get('embed') === '1'

function stored<T extends string>(key: string, fallback: T): T {
  const fromQuery = search.get(key)
  if (fromQuery) return fromQuery as T
  try {
    return (localStorage.getItem(`resq.${key}`) as T) || fallback
  } catch {
    return fallback
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  const [theme, setThemeState] = useState<Theme>(() => stored<Theme>('theme', 'light'))
  const [role, setRoleState] = useState<Role>(() => stored<Role>('role', 'regulator'))
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS)
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [emptyData, setEmptyData] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Supabase: load existing complaints + subscribe to realtime inserts
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false
    const load = async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
      if (error || cancelled) return
      setReports((data || []).map(complaintToReport))
    }
    load()

    const channel = supabase
      .channel('realtime:complaints')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload) => {
          if (cancelled) return
          const report = complaintToReport(payload.new as any)
          setReports((prev) => (prev.some((r) => r.id === report.id) ? prev : [report, ...prev]))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [isSupabaseConfigured])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const navigate = useCallback((r: Route) => {
    const h = routeToHash(r)
    if (window.location.hash !== h) window.location.hash = h
    else setRoute(r)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem('resq.theme', t)
    } catch {}
  }, [])
  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try {
      localStorage.setItem('resq.role', r)
    } catch {}
  }, [])

  const addReport = useCallback(
    async (r: Report) => {
      setReports((prev) => (prev.some((p) => p.id === r.id) ? prev : [r, ...prev]))
      if (!isSupabaseConfigured) return
      await supabase.from('complaints').insert([
        {
          id: r.id,
          title: r.title,
          description: r.description,
          latitude: r.lat,
          longitude: r.lng,
          severity: r.severity,
        },
      ])
    },
    [isSupabaseConfigured],
  )

  const updateStatus = useCallback((id: string, status: Status) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id && r.status !== status
          ? {
              ...r,
              status,
              timeline: [
                ...r.timeline,
                { id: `${id}-${Date.now()}`, at: Date.now(), label: `Status changed to ${status[0].toUpperCase()}${status.slice(1)}`, by: 'You, regulator desk', status },
              ],
            }
          : r,
      ),
    )
  }, [])

  const assignTeam = useCallback((id: string, team: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              assignedTeam: team,
              timeline: [...r.timeline, { id: `${id}-${Date.now()}`, at: Date.now(), label: `Assigned to ${team}`, by: 'You, regulator desk' }],
            }
          : r,
      ),
    )
  }, [])

  const value = useMemo<AppState>(
    () => ({
      route,
      navigate,
      theme,
      setTheme,
      role,
      setRole,
      reports: emptyData ? reports.filter((r) => !SEED_IDS.has(r.id)) : reports,
      addReport,
      updateStatus,
      assignTeam,
      simulateFailure,
      setSimulateFailure,
      emptyData,
      setEmptyData,
      embedded,
      user: { name: 'Ama Mensah', email: 'ama.mensah@gmail.com' },
    }),
    [route, navigate, theme, setTheme, role, setRole, reports, addReport, updateStatus, assignTeam, simulateFailure, emptyData],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}
