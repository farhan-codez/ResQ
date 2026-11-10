import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DETECTIONS, INITIAL_REPORTS } from './data'
import type { Detection, DispatchAlert, Report, Role, Status } from './types'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { fetchDetections, fetchEvents, fetchProfile, fetchReports, insertReport, setComplaintStatus, setComplaintTeam, toReport, upgradeGuestToCitizen } from './api'
import { createDispatchAlerts, fetchAlertsForReport, fetchAllDispatchAlerts } from './dispatch'

export type Route =
  | { name: 'library' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'guest' }
  | { name: 'guest-upgrade' }
  | { name: 'dashboard'; incident?: string; focus?: string }
  | { name: 'reports'; incident?: string }
  | { name: 'dispatch'; alertId?: string }

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
    case 'guest':
      return { name: 'guest' }
    case 'guest-upgrade':
      return { name: 'guest-upgrade' }
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
  if ('alertId' in r && r.alertId) q.set('alertId', r.alertId)
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
  detections: Detection[]
  dispatchAlerts: DispatchAlert[]
  /** Rejects if the backend refuses the write. */
  addReport: (r: Report, photoFiles?: File[], voiceNote?: Blob) => Promise<void>
  updateStatus: (id: string, status: Status) => Promise<void>
  assignTeam: (id: string, team: string) => Promise<void>
  updateDispatchStatus: (id: string, status: DispatchAlert['status']) => Promise<void>
  upgradeGuest: (citizenUserId: string) => Promise<void>
  signOut: () => Promise<void>
  authReady: boolean
  signedIn: boolean
  user: { name: string; email: string }
}

const Ctx = createContext<AppState | null>(null)

const search = new URLSearchParams(window.location.search)

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
  const [role, setRoleState] = useState<Role>(() => {
    // Check for existing guest session
    const guestId = localStorage.getItem('resq.guest.current')
    if (guestId) return 'guest'
    return stored<Role>('role', 'citizen')
  })
  const [reports, setReports] = useState<Report[]>(isSupabaseConfigured ? [] : INITIAL_REPORTS)
  const [detections, setDetections] = useState<Detection[]>(isSupabaseConfigured ? [] : DETECTIONS)
  const [dispatchAlerts, setDispatchAlerts] = useState<DispatchAlert[]>(isSupabaseConfigured ? [] : [])
  const [session, setSession] = useState<{ id: string; email: string; name: string } | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Auth session (Supabase). Demo mode skips this and keeps the original simulated sign-in.
  // Also checks for guest session from localStorage.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: check for guest session
      const guestId = localStorage.getItem('resq.guest.current')
      if (guestId) {
        const guestData = localStorage.getItem(`resq.guest.${guestId}`)
        if (guestData) {
          const { faceDescriptor, createdAt } = JSON.parse(guestData)
          setSession({ id: guestId, email: '', name: `Guest ${guestId.slice(-4)}` })
          setRoleState('guest')
        }
      }
      setAuthReady(true)
      return
    }
    let cancelled = false
    const apply = async (s: { user: { id: string; email?: string; user_metadata?: Record<string, any> } } | null) => {
      if (cancelled) return
      if (!s) {
        // No Supabase session - check for guest
        const guestId = localStorage.getItem('resq.guest.current')
        if (guestId) {
          const guestData = localStorage.getItem(`resq.guest.${guestId}`)
          if (guestData) {
            const { faceDescriptor, createdAt } = JSON.parse(guestData)
            setSession({ id: guestId, email: '', name: `Guest ${guestId.slice(-4)}` })
            setRoleState('guest')
            setAuthReady(true)
            return
          }
        }
        setSession(null)
        setRoleState('citizen')
        setAuthReady(true)
        return
      }
      const u = s.user
      const meta = u.user_metadata ?? {}
      const fallbackName = (meta.full_name as string) || (meta.name as string) || (u.email ?? 'Citizen')
      setSession({ id: u.id, email: u.email ?? '', name: fallbackName })
      setAuthReady(true)
      const profile = await fetchProfile(u.id)
      if (cancelled || !profile) return
      setSession({ id: u.id, email: profile.email || u.email || '', name: profile.name })
      setRoleState(profile.role)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // Defer: awaiting supabase calls inside this callback can deadlock the auth client.
      setTimeout(() => apply(s), 0)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Route guard: reports and map need a signed-in user. Signed-in users skip the login screen.
  // The regulator workspace is for regulator accounts only.
  // Guests can access dashboard (map + report) but not reports list.
  useEffect(() => {
    if (!isSupabaseConfigured || !authReady) return
    if (!session && (route.name === 'dashboard' || route.name === 'reports')) navigate({ name: 'login' })
    else if (session && route.name === 'login') navigate({ name: 'dashboard' })
    else if (session && route.name === 'reports' && role !== 'regulator') navigate({ name: 'dashboard' })
  }, [authReady, session, route, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Complaints + detections: load and stay live (signed-in only, so RLS-visible rows match the session).
  // Guests also get reports in demo mode.
  const userId = session?.id
  const isGuest = role === 'guest'
  useEffect(() => {
    if (!isSupabaseConfigured && !isGuest) return
    if (isSupabaseConfigured && !userId && !isGuest) return
    let cancelled = false
    const guard = <T,>(fn: (v: T) => void) => (v: T) => {
      if (!cancelled) fn(v)
    }
    fetchReports().then(guard(setReports)).catch(() => {})
    fetchDetections().then(guard(setDetections)).catch(() => {})

    const refreshTimeline = async (id: string) => {
      try {
        const ev = await fetchEvents(id)
        if (cancelled) return
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, timeline: toReport({ ...rowOf(r) } as any, ev).timeline } : r)))
      } catch {}
    }
    const rowOf = (r: Report) => ({ id: r.id, created_at: new Date(r.createdAt).toISOString(), title: r.title, description: r.description, latitude: r.lat, longitude: r.lng, severity: r.severity, status: r.status, place: r.place, region: r.region, photos: r.photos, reporter_name: r.reporter.name, is_anonymous: r.reporter.anonymous, assigned_team: r.assignedTeam ?? null })

    const channel = supabase
      .channel('realtime:resq')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints' }, (payload) => {
        if (cancelled) return
        const report = toReport(payload.new as any)
        setReports((prev) => (prev.some((r) => r.id === report.id) ? prev : [report, ...prev]))
        refreshTimeline(report.id)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'complaints' }, (payload) => {
        if (cancelled) return
        const next = toReport(payload.new as any)
        setReports((prev) => prev.map((r) => (r.id === next.id ? { ...next, timeline: r.timeline } : r)))
        refreshTimeline(next.id)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaint_events' }, (payload) => {
        const id = (payload.new as { complaint_id: string }).complaint_id
        refreshTimeline(id)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Dispatch alerts realtime (regulators only)
  useEffect(() => {
    if (!isSupabaseConfigured || !userId || role !== 'regulator') return
    let cancelled = false
    const guard = <T,>(fn: (v: T) => void) => (v: T) => {
      if (!cancelled) fn(v)
    }
    fetchAllDispatchAlerts().then(guard(setDispatchAlerts)).catch(() => {})

    const channel = supabase
      .channel('realtime:dispatch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispatch_alerts' }, (payload) => {
        if (cancelled) return
        const alert = payload.new as DispatchAlert
        setDispatchAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev]))
        // Toast notification for new dispatch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('resq:new-dispatch', { detail: alert }))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dispatch_alerts' }, (payload) => {
        if (cancelled) return
        const alert = payload.new as DispatchAlert
        setDispatchAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)))
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId, role])

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
    async (r: Report, photoFiles: File[] = [], voiceNote?: Blob) => {
      if (!isSupabaseConfigured) {
        setReports((prev) => (prev.some((p) => p.id === r.id) ? prev : [r, ...prev]))
        return
      }
      if (!session) throw new Error('Sign in to send a report.')
      const { photos, voiceUrl } = await insertReport(r, photoFiles, session.id, voiceNote)
      const saved = { ...r, photos, voiceNote: voiceUrl ?? undefined }
      // Realtime also delivers this row; the id check keeps it from doubling.
      setReports((prev) => (prev.some((p) => p.id === saved.id) ? prev : [saved, ...prev]))

      // Fire-and-forget: create dispatch alerts for the new report
      void createDispatchAlerts(saved).catch((e) => console.warn('dispatch failed', e))
    },
    [session],
  )

  const updateStatus = useCallback(async (id: string, status: Status) => {
    if (isSupabaseConfigured) {
      await setComplaintStatus(id, status)
      return
    }
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

  const assignTeam = useCallback(async (id: string, team: string) => {
    if (isSupabaseConfigured) {
      await setComplaintTeam(id, team)
      return
    }
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

  const updateDispatchStatus = useCallback(async (id: string, status: DispatchAlert['status']) => {
    if (!isSupabaseConfigured) return
    await supabase.from('dispatch_alerts').update({ status }).eq('id', id)
    setDispatchAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }, [])

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    // Clear guest session
    const guestId = localStorage.getItem('resq.guest.current')
    if (guestId) {
      localStorage.removeItem(`resq.guest.${guestId}`)
      localStorage.removeItem('resq.guest.current')
    }
    setReports(isSupabaseConfigured ? [] : INITIAL_REPORTS)
  }, [])

  const upgradeGuest = useCallback(async (citizenUserId: string) => {
    if (!isSupabaseConfigured) return
    const guestId = localStorage.getItem('resq.guest.current')
    if (!guestId) throw new Error('No guest session to upgrade')
    await upgradeGuestToCitizen(guestId, citizenUserId)
    // Clear guest session
    localStorage.removeItem(`resq.guest.${guestId}`)
    localStorage.removeItem('resq.guest.current')
    // The auth state change will trigger a new session with citizen role
  }, [])

  const value = useMemo<AppState>(
    () => ({
      route,
      navigate,
      theme,
      setTheme,
      role,
      setRole,
      reports,
      detections,
      dispatchAlerts,
      addReport,
      updateStatus,
      assignTeam,
      updateDispatchStatus,
      upgradeGuest,
      signOut,
      authReady,
      signedIn: isSupabaseConfigured ? !!session : true,
      user: isSupabaseConfigured ? { name: session?.name ?? '', email: session?.email ?? '' } : { name: 'Ama Mensah', email: 'ama.mensah@gmail.com' },
    }),
    [route, navigate, theme, setTheme, role, setRole, reports, detections, dispatchAlerts, addReport, updateStatus, assignTeam, updateDispatchStatus, upgradeGuest, signOut, authReady, session],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}
