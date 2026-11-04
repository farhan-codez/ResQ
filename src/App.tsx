import { ToastProvider } from '@/components/ui/Toast'
import { AppProvider, routeToHash, useApp } from '@/lib/store'
import { Dashboard } from '@/screens/Dashboard'
import { Library } from '@/screens/Library'
import { Login } from '@/screens/Login'
import { ReportsList } from '@/screens/ReportsList'
import { Signup } from '@/screens/Signup'

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