import { ToastProvider } from '@/components/ui/Toast'
import { AppProvider, useApp } from '@/lib/store'
import { Dashboard } from '@/screens/Dashboard'
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
    case 'dashboard':
      return <Dashboard />
    case 'reports':
      return <ReportsList />
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
