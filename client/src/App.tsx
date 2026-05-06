import { Suspense, lazy, type ComponentType } from 'react'
import { Switch, Route, Redirect } from 'wouter'
import { trpc } from './lib/trpc'
import Login from './pages/Login'
import Home from './pages/Home'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Asistencia = lazy(() => import('./pages/Asistencia'))
const Tareas = lazy(() => import('./pages/Tareas'))
const Historial = lazy(() => import('./pages/Historial'))
const Empleados = lazy(() => import('./pages/Empleados'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const ImprimirReclamo = lazy(() => import('./pages/ImprimirReclamo'))
const ImprimirAsistencia = lazy(() => import('./pages/ImprimirAsistencia'))
const Leads = lazy(() => import('./pages/Leads'))
const Operaciones = lazy(() => import('./pages/Operaciones'))
const TareasOperativas = lazy(() => import('./pages/TareasOperativas'))
const Cobranzas = lazy(() => import('./pages/Cobranzas'))
const BotComercial = lazy(() => import('./pages/BotComercial'))
const Gastronomia = lazy(() => import('./pages/Gastronomia/Index'))
const GastronomiaPlanificacion = lazy(() => import('./pages/Gastronomia/Planificacion'))
const GastronomiaPersonal = lazy(() => import('./pages/Gastronomia/Personal'))
const GastronomiaAsistencia = lazy(() => import('./pages/Gastronomia/Asistencia'))
const GastronomiaLiquidacion = lazy(() => import('./pages/Gastronomia/Liquidacion'))

type PanelRole = 'admin' | 'employee' | 'sales' | 'collections'

function getDefaultRoute(role?: PanelRole) {
  if (role === 'collections') return '/cobranzas'
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
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>
  if (!user) return <Redirect to="/login" />
  if (allowedRoles && !allowedRoles.includes((user as any).role)) {
    return <Redirect to={getDefaultRoute((user as any).role)} />
  }
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Cargando panel...</div>}>
      <Component />
    </Suspense>
  )
}

export default function App() {
  return (
    <>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/asistencia">{() => <ProtectedRoute component={Asistencia} allowedRoles={['admin']} />}</Route>
      <Route path="/asistencia/imprimir">{() => <ProtectedRoute component={ImprimirAsistencia} allowedRoles={['admin']} />}</Route>
      <Route path="/operaciones">{() => <ProtectedRoute component={Operaciones} allowedRoles={['admin']} />}</Route>
      <Route path="/tareas-operativas">{() => <ProtectedRoute component={TareasOperativas} allowedRoles={['admin']} />}</Route>
      <Route path="/tareas">{() => <ProtectedRoute component={Tareas} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/historial">{() => <ProtectedRoute component={Historial} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/empleados">{() => <ProtectedRoute component={Empleados} allowedRoles={['admin']} />}</Route>
      <Route path="/configuracion">{() => <ProtectedRoute component={Configuracion} allowedRoles={['admin']} />}</Route>
      <Route path="/leads">{() => <ProtectedRoute component={Leads} allowedRoles={['admin', 'sales']} />}</Route>
      <Route path="/bot-comercial">{() => <ProtectedRoute component={BotComercial} allowedRoles={['admin']} />}</Route>
      <Route path="/cobranzas">{() => <ProtectedRoute component={Cobranzas} allowedRoles={['admin', 'collections']} />}</Route>
      <Route path="/imprimir">{() => <ProtectedRoute component={ImprimirReclamo} allowedRoles={['admin', 'employee']} />}</Route>
      <Route path="/gastronomia">{() => <ProtectedRoute component={Gastronomia} allowedRoles={['admin']} />}</Route>
      <Route path="/gastronomia/planificacion">{() => <ProtectedRoute component={GastronomiaPlanificacion} allowedRoles={['admin']} />}</Route>
      <Route path="/gastronomia/personal">{() => <ProtectedRoute component={GastronomiaPersonal} allowedRoles={['admin']} />}</Route>
      <Route path="/gastronomia/asistencia">{() => <ProtectedRoute component={GastronomiaAsistencia} allowedRoles={['admin']} />}</Route>
      <Route path="/gastronomia/liquidacion">{() => <ProtectedRoute component={GastronomiaLiquidacion} allowedRoles={['admin']} />}</Route>
      <Route>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-heading font-bold text-primary">404</h1>
          <p className="text-gray-500 mt-2">Página no encontrada</p>
          <a href="/" className="mt-4 text-primary underline">Volver al inicio</a>
        </div>
      </Route>
    </Switch>
    </>
  )
}
