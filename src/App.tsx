import { ToastProvider } from '@/components/ui/Toast'
import { AppProvider, useApp } from '@/lib/store'
import { Dashboard } from '@/screens/Dashboard'
import { DispatchList } from '@/screens/Dispatch'
import { GuestAuth } from '@/screens/GuestAuth'
import { Library } from '@/screens/Library'
import { Login } from '@/screens/Login'
import { ReportsList } from '@/screens/ReportsList'
import { Signup } from '@/screens/Signup'

function Screen() {
  const { route, authReady } = useApp()
  if (!authReady) return null
  switch (route.name) {
    // Design-system showcase. Development builds only; never shipped to users.
    case 'library':
      return import.meta.env.DEV ? <Library /> : <Login />
    case 'signup':
      return <Signup />
    case 'guest':
      return <GuestAuth />
    case 'dashboard':
      return <Dashboard />
    case 'reports':
      return <ReportsList />
    case 'dispatch':
      const { role, navigate } = useApp()
      return role === 'regulator' ? <DispatchList onClose={() => navigate({ name: 'reports' })} /> : <Login />
    default:
      return <Login />
  }
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Screen />
      </ToastProvider>
    </AppProvider>
  )
}
