import { Suspense, lazy, type ComponentType } from 'react'
import { Switch, Route, Redirect } from 'wouter'
import { Toaster } from 'sonner'
import { trpc } from './lib/trpc'
import { DashboardSkeleton } from './components/ui/skeleton'
import { ConfirmProvider } from './components/ui/confirm-dialog'
import { ErrorBoundary } from './components/ui/error-boundary'
import Login from './pages/Login'
import Home from './pages/Home'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tareas = lazy(() => import('./pages/Tareas'))
const Historial = lazy(() => import('./pages/Historial'))
const Empleados = lazy(() => import('./pages/Empleados'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const ImprimirReclamo = lazy(() => import('./pages/ImprimirReclamo'))
const Leads = lazy(() => import('./pages/Leads'))
const Operaciones = lazy(() => import('./pages/Operaciones'))
const TareasOperativas = lazy(() => import('./pages/TareasOperativas'))

type PanelRole = 'admin' | 'employee' | 'sales'

function getDefaultRoute(role?: PanelRole) {
  return role === 'sales' ? '/leads' : '/dashboard'
}

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: ComponentType
  allowedRoles?: PanelRole[]
}) {
  const { data: user, isLoading } = trpc.auth.me.useQuery()
  if (isLoading) return (
    <div className="flex h-screen bg-[#F4F6F8]">
      <div className="hidden md:block w-64 bg-[#1E2832]" />
      <div className="flex-1 p-5"><DashboardSkeleton /></div>
    </div>
  )
  if (!user) return <Redirect to="/login" />
  if (allowedRoles && !allowedRoles.includes((user as any).role)) {
    return <Redirect to={getDefaultRoute((user as any).role)} />
  }
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen bg-[#F4F6F8]">
          <div className="hidden md:block w-64 bg-[#1E2832]" />
          <div className="flex-1 p-5"><DashboardSkeleton /></div>
        </div>
      }>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <ConfirmProvider>
    <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/operaciones">{() => <ProtectedRoute component={Operaciones} allowedRoles={['admin']} />}</Route>
      <Route path="/tareas-operativas">{() => <ProtectedRoute component={TareasOperativas} allowedRoles={['admin']} />}</Route>
      <Route path="/tareas">{() => <ProtectedRoute component={Tareas} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/historial">{() => <ProtectedRoute component={Historial} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/empleados">{() => <ProtectedRoute component={Empleados} allowedRoles={['admin']} />}</Route>
      <Route path="/configuracion">{() => <ProtectedRoute component={Configuracion} allowedRoles={['admin']} />}</Route>
      <Route path="/leads">{() => <ProtectedRoute component={Leads} allowedRoles={['admin', 'sales']} />}</Route>
      <Route path="/imprimir">{() => <ProtectedRoute component={ImprimirReclamo} allowedRoles={['admin', 'employee']} />}</Route>
      <Route>
        <div className="flex flex-col items-center justify-center h-screen bg-[#F4F6F8]">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-3xl font-heading font-bold text-primary">404</span>
          </div>
          <h2 className="font-heading font-semibold text-lg text-gray-800">Página no encontrada</h2>
          <p className="text-sm text-gray-500 mt-1">La página que buscás no existe o fue movida.</p>
          <a href="/dashboard" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
            Ir al Dashboard
          </a>
        </div>
      </Route>
    </Switch>
    </ConfirmProvider>
    </ErrorBoundary>
  )
}
