import { Switch, Route, Redirect } from 'wouter'
import { trpc } from './lib/trpc'
import Login from './pages/Login'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Tareas from './pages/Tareas'
import Historial from './pages/Historial'
import Empleados from './pages/Empleados'
import Configuracion from './pages/Configuracion'
import ImprimirReclamo from './pages/ImprimirReclamo'
import Leads from './pages/Leads'

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>
  if (!user) return <Redirect to="/login" />
  return <Component />
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/tareas">{() => <ProtectedRoute component={Tareas} />}</Route>
      <Route path="/historial">{() => <ProtectedRoute component={Historial} />}</Route>
      <Route path="/empleados">{() => <ProtectedRoute component={Empleados} />}</Route>
      <Route path="/configuracion">{() => <ProtectedRoute component={Configuracion} />}</Route>
      <Route path="/leads">{() => <ProtectedRoute component={Leads} />}</Route>
      <Route path="/imprimir">{() => <ProtectedRoute component={ImprimirReclamo} />}</Route>
      <Route>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-heading font-bold text-primary">404</h1>
          <p className="text-gray-500 mt-2">Página no encontrada</p>
          <a href="/" className="mt-4 text-primary underline">Volver al inicio</a>
        </div>
      </Route>
    </Switch>
  )
}
