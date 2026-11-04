import { ToastProvider } from './components/ui/Toast'
import { AppProvider, routeToHash, useApp } from './lib/store'
import { Dashboard } from './screens/Dashboard'
import { Library } from './screens/Library'
import { Login } from './screens/Login'
import { ReportsList } from './screens/ReportsList'
import { Signup } from './screens/Signup'

function Screen() {
  const { route } = useApp()
  switch (route.name) {
    case 'library':
      return <Library />
    case 'signup':
      return <Signup />
    case 'dashboard':
      return <Dashboard />
    case 'reports':
      return <ReportsList />
    default:
      return <Login />
  }
}

/** Renders the app at 375px inside an iframe so real mobile breakpoints apply. */
function MobileFrame() {
  const { route, theme, role } = useApp()
  const src = `${window.location.pathname}?embed=1&theme=${theme}&role=${role}${routeToHash(route)}`
  return (
    <div className="flex min-h-full items-center justify-center bg-surface-3 p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="overflow-hidden rounded-[44px] border-[10px] border-[#101413] bg-[#101413] shadow-overlay">
          <iframe id="resq-mobile-frame" key={`${theme}-${role}`} title="ResQ mobile preview, 375 by 812" src={src} className="block h-[812px] w-[375px] rounded-[34px] bg-bg" />
        </div>
        <p className="text-xs text-fg-muted">375 × 812 · mobile layout</p>
      </div>
    </div>
  )
}

function Root() {
  const { embedded } = useApp()
  if (embedded) return <Screen />
  return <Screen />
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </AppProvider>
  )
}
