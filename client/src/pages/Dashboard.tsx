import { Suspense, lazy, useState, type ReactNode } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { RoundsSummaryCard } from '../components/rounds/RoundsSummaryCard'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { ESTADOS, PRIORIDADES } from '@shared/const'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, X, Building2, PauseCircle } from 'lucide-react'

const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'))
const ESTADOS_ASIGNACION = [
  { value: 'sin_asignar', label: 'Sin asignar', color: '#6B7280' },
  { value: 'pendiente_confirmacion', label: 'Sin confirmar', color: '#D97706' },
  { value: 'aceptada', label: 'Aceptada', color: '#059669' },
  { value: 'rechazada', label: 'Rechazada', color: '#DC2626' },
] as const

function Badge({ value, options }: { value: string; options: readonly { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}>
      {opt?.label ?? value}
    </span>
  )
}

function KpiCard({ label, value, color, icon: Icon }: any) {
  return (
    <div className="surface-panel rounded-[22px] p-4 border border-slate-200 min-h-[104px]" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500 leading-tight max-w-[9rem]">{label}</p>
          <p className="text-[26px] leading-none font-heading font-semibold mt-2" style={{ color }}>{value}</p>
        </div>
        <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}10` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function TeamMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone: 'blue' | 'amber' | 'green' | 'rose' | 'slate' | 'cyan'
}) {
  const tones = {
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  }

  return (
    <div className={`rounded-[18px] border px-3 py-3 min-h-[78px] flex flex-col justify-between ${tones[tone]}`}>
      <div className="text-[11px] font-medium leading-tight opacity-75">{label}</div>
      <div className="mt-2 font-heading text-[22px] leading-none font-semibold">{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const [filters, setFilters] = useState({ estado: '', prioridad: '', busqueda: '' })
  const [selected, setSelected] = useState<number|null>(null)
  const [nota, setNota] = useState('')
  const [showNota, setShowNota] = useState(false)
  const [assigningTo, setAssigningTo] = useState('')

  const { data: stats } = trpc.reportes.estadisticas.useQuery(undefined, { refetchInterval: 30000 })
  const { data: roundsSummary } = trpc.rondas.resumenHoy.useQuery(undefined, { refetchInterval: 30000 })
  const { data: tareasResumen } = trpc.tareasOperativas.resumenHoy.useQuery(undefined, { refetchInterval: 30000 })
  const { data: reportes = [], refetch } = trpc.reportes.listar.useQuery(filters, { refetchInterval: 30000 })
  const { data: reporte } = trpc.reportes.obtener.useQuery({ id: selected! }, { enabled: !!selected, refetchInterval: 15000 })
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const cambiarEstado = trpc.reportes.actualizarEstado.useMutation({
    onSuccess: () => { refetch(); setSelected(null) },
    onError: (err) => alert(err.message),
  })
  const asignar = trpc.reportes.asignar.useMutation({ onSuccess: () => { refetch(); setAssigningTo('') } })
  const agregarNota = trpc.reportes.agregarNota.useMutation({ onSuccess: () => { refetch(); setNota(''); setShowNota(false) } })
  const crearTareaDesdeReclamo = trpc.tareasOperativas.crearDesdeReclamo.useMutation({
    onSuccess: () => {
      refetch()
    },
  })
  const prioridadTotal = stats?.porPrioridad?.reduce((acc: number, item: any) => acc + (item.count ?? 0), 0) ?? 0
  const empleadoSeleccionado = empleados.find((empleado: any) => String(empleado.id) === assigningTo)

  return (
    <DashboardLayout title="Dashboard">
      {roundsSummary ? (
        <div className="mb-4">
          <RoundsSummaryCard resumen={roundsSummary} />
        </div>
      ) : null}

      {tareasResumen ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Tareas activas" value={tareasResumen.activas} color="#2563EB" icon={Clock} />
          <KpiCard label="Pausadas" value={tareasResumen.pausadas} color="#D97706" icon={PauseCircle} />
          <KpiCard label="Terminadas hoy" value={tareasResumen.terminadasHoy} color="#059669" icon={CheckCircle2} />
          <KpiCard label="Rechazadas" value={tareasResumen.rechazadasHoy} color="#DC2626" icon={AlertCircle} />
        </div>
      ) : null}

      <div className="surface-panel-strong rounded-[24px] p-4 md:p-5 mb-4 overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.07),transparent_72%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              Resumen ejecutivo
            </div>
            <h2 className="mt-2.5 font-heading text-[18px] md:text-[24px] leading-tight font-semibold text-sidebar-bg">
              Seguimiento operativo de mantenimiento en tiempo real
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] text-slate-600">
              Monitoreá reclamos, prioridades, avance del equipo y atención a locatarios desde un panel más claro y ejecutivo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-[20px] bg-primary p-3.5 text-white shadow-lg">
              <div className="text-[11px] font-medium text-white/60">Abiertos</div>
              <div className="mt-2 text-[24px] leading-none font-heading font-semibold">{stats ? stats.abiertos : 0}</div>
              <div className="mt-1 text-xs text-white/70">Pendientes, en curso y pausados</div>
            </div>
            <div className="rounded-[20px] bg-white p-3.5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <Building2 size={14} />
                Cobertura
              </div>
              <div className="mt-2 text-[24px] leading-none font-heading font-semibold text-primary">{empleados.length}</div>
              <div className="mt-1 text-xs text-slate-500">Empleados registrados</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-3 mb-4">
          <KpiCard label="Total" value={stats.total} color="#2563EB" icon={TrendingUp} />
          <KpiCard label="Pendientes" value={stats.pendientes} color="#D97706" icon={Clock} />
          <KpiCard label="En progreso" value={stats.enProgreso} color="#D97706" icon={AlertCircle} />
          <KpiCard label="Pausados" value={stats.pausados} color="#6B7280" icon={PauseCircle} />
          <KpiCard label="Completados" value={stats.completados} color="#059669" icon={CheckCircle2} />
          <KpiCard label="Sin confirmar" value={stats.asignacionesPendientes} color="#D97706" icon={Clock} />
          <KpiCard label="Aceptadas hoy" value={stats.asignacionesAceptadasHoy} color="#059669" icon={CheckCircle2} />
          <KpiCard label="Rechazadas hoy" value={stats.asignacionesRechazadasHoy} color="#DC2626" icon={AlertCircle} />
          <KpiCard label="Resolución" value={`${stats.tasaCompletitud}%`} color="#2563EB" icon={TrendingUp} />
        </div>
      )}

      {stats?.rankingEmpleadosHoy?.length > 0 && (
        <div className="surface-panel rounded-[22px] p-4 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-heading font-semibold text-base text-gray-800">Rendimiento del equipo hoy</h3>
              <p className="text-[13px] text-slate-500">Control diario de carga operativa, respuestas de asignación y tiempo efectivo trabajado.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.rankingEmpleadosHoy.map((empleado: any, index: number) => (
              <div key={empleado.empleadoId} className="rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-medium text-slate-400">Puesto #{index + 1}</div>
                    <div className="mt-1 font-heading text-base font-semibold text-slate-800">{empleado.nombre}</div>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-heading font-semibold text-sm">
                    {empleado.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3.5 auto-rows-fr">
                  <TeamMetric label="Activas" value={empleado.tareasActivas} tone="blue" />
                  <TeamMetric label="Sin confirmar" value={empleado.pendientesConfirmacion} tone="amber" />
                  <TeamMetric label="Cerradas" value={empleado.completadasHoy} tone="green" />
                  <TeamMetric label="Aceptadas" value={empleado.aceptadasHoy} tone="cyan" />
                  <TeamMetric label="Rechazadas" value={empleado.rechazadasHoy} tone="rose" />
                  <TeamMetric
                    label="Horas hoy"
                    value={<WorkingTime seconds={empleado.horasTrabajadasHoySegundos} />}
                    tone="slate"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.abiertos > 0 && (
        <Suspense
          fallback={
            <div className="surface-panel rounded-[22px] p-5 mb-4 text-sm text-slate-500">
              Cargando gráficos operativos...
            </div>
          }
        >
          <DashboardCharts stats={stats} prioridadTotal={prioridadTotal} />
        </Suspense>
      )}

      {stats && stats.abiertos === 0 && stats.total > 0 && (
        <div className="surface-panel rounded-[22px] p-7 mb-4 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
          <h3 className="font-heading text-lg font-semibold text-sidebar-bg">No hay reclamos abiertos</h3>
          <p className="mt-2 text-[13px] text-slate-500">
            Todos los reclamos vigentes están resueltos o cerrados. La tasa de resolución actual es {stats.tasaCompletitud}%.
          </p>
        </div>
      )}

      {/* Filters + Table */}
      <div className="surface-panel rounded-[22px] overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap gap-3 items-center bg-white/70">
          <input
            value={filters.busqueda}
            onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar locatario, local, título..."
            className="border border-gray-200 rounded-2xl px-4 py-2.5 text-[13px] flex-1 min-w-48 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            className="border border-gray-200 rounded-2xl px-4 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filters.prioridad} onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
            className="border border-gray-200 rounded-2xl px-4 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-[11px]">
              <tr>
                {['#','Locatario','Local','Categoría','Prioridad','Estado','Asignado','Recepción','Tiempo','Fecha','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {reportes.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">No hay reclamos</td></tr>
              ) : reportes.map(r => (
                <tr key={r.id} className="hover:bg-white/70 cursor-pointer transition-colors" onClick={() => setSelected(r.id)}>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{r.id.toString().padStart(4,'0')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.locatario}</td>
                  <td className="px-4 py-3 text-gray-600">{r.local}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.categoria}</td>
                  <td className="px-4 py-3"><Badge value={r.prioridad} options={PRIORIDADES} /></td>
                  <td className="px-4 py-3"><Badge value={r.estado} options={ESTADOS} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.asignadoA ?? '—'}</td>
                  <td className="px-4 py-3"><Badge value={(r as any).asignacionEstado ?? 'sin_asignar'} options={ESTADOS_ASIGNACION} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-medium">
                    <WorkingTime
                      seconds={(r as any).tiempoTrabajadoSegundos}
                      isRunning={r.estado === 'en_progreso'}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-AR') : ''}</td>
                  <td className="px-4 py-3">
                    <button className="text-primary text-xs hover:underline" onClick={e => { e.stopPropagation(); window.open(`/imprimir?id=${r.id}`, '_blank') }}>
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      {selected && reporte && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSelected(null)}>
          <div className="surface-panel-strong w-full md:max-w-2xl md:rounded-[32px] rounded-t-[32px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex items-start gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-mono mb-1">#{reporte.id.toString().padStart(4,'0')}</div>
                <h2 className="font-heading font-bold text-lg">{reporte.titulo}</h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge value={reporte.prioridad} options={PRIORIDADES} />
                  <Badge value={reporte.estado} options={ESTADOS} />
                  <span className="text-xs text-gray-500">{reporte.local} — {reporte.planta === 'baja' ? 'Planta Baja' : 'Planta Alta'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-gray-400 uppercase font-medium mb-1">Descripción</div>
                <p className="text-sm text-gray-700">{reporte.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Locatario:</span> {reporte.locatario}</div>
                <div><span className="text-gray-400">Categoría:</span> {reporte.categoria}</div>
                {reporte.contacto && <div><span className="text-gray-400">Tel:</span> {reporte.contacto}</div>}
                {reporte.asignadoA && <div><span className="text-gray-400">Asignado a:</span> {reporte.asignadoA}</div>}
                <div>
                  <span className="text-gray-400">Recepción:</span>{' '}
                  <Badge value={(reporte as any).asignacionEstado ?? 'sin_asignar'} options={ESTADOS_ASIGNACION} />
                </div>
                {(reporte as any).asignacionRespondidaAt && (
                  <div><span className="text-gray-400">Respuesta:</span> {new Date((reporte as any).asignacionRespondidaAt).toLocaleString('es-AR')}</div>
                )}
                <div>
                  <span className="text-gray-400">Tiempo trabajado:</span>{' '}
                  <WorkingTime
                    seconds={(reporte as any).tiempoTrabajadoSegundos}
                    isRunning={reporte.estado === 'en_progreso'}
                    className="font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {reporte.estado !== 'completado' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'completado' })} loading={cambiarEstado.isLoading}>
                      Completar
                    </Button>
                    {reporte.estado === 'pendiente' && reporte.asignacionEstado !== 'pendiente_confirmacion' && (
                      <Button size="sm" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'en_progreso' })}>
                        Iniciar
                      </Button>
                    )}
                    {reporte.asignacionEstado === 'pendiente_confirmacion' && (
                      <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded border border-amber-200">
                        Esperando confirmación del empleado
                      </span>
                    )}
                    {reporte.estado === 'en_progreso' && (
                      <Button size="sm" variant="outline" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'pausado' })}>
                        Pausar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'cancelado' })}>
                      Cancelar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => window.open(`/imprimir?id=${reporte.id}`, '_blank')}>
                  Imprimir A4
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={crearTareaDesdeReclamo.isLoading}
                  onClick={() => crearTareaDesdeReclamo.mutate({
                    reporteId: reporte.id,
                    tipoTrabajo: reporte.categoria,
                    empleadoId: empleadoSeleccionado?.id,
                  })}
                >
                  Crear trabajo operativo
                </Button>
              </div>

              {/* Assign */}
              {empleados.length > 0 && reporte.estado !== 'completado' && (
                <div className="flex gap-2">
                  <select value={assigningTo} onChange={e => setAssigningTo(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Asignar a empleado...</option>
                    {empleados.map((empleado: any) => (
                      <option key={empleado.id} value={empleado.id}>
                        {empleado.nombre}{empleado.waId ? '' : ' · sin WhatsApp'}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!empleadoSeleccionado}
                    onClick={() => {
                      if (!empleadoSeleccionado) return
                      asignar.mutate({
                        id: reporte.id,
                        empleadoId: empleadoSeleccionado.id,
                        empleadoNombre: empleadoSeleccionado.nombre,
                      })
                    }}
                  >
                    Asignar
                  </Button>
                </div>
              )}

              {/* Note */}
              {showNota ? (
                <div className="flex gap-2">
                  <input value={nota} onChange={e => setNota(e.target.value)}
                    placeholder="Escribí una nota..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button size="sm" disabled={!nota} onClick={() => agregarNota.mutate({ id: reporte.id, nota })} loading={agregarNota.isLoading}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNota(false)}>Cancelar</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowNota(true)}>+ Agregar nota</Button>
              )}

              {/* History */}
              {(reporte as any).actualizaciones?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase font-medium mb-3">Historial</div>
                  <div className="space-y-2">
                    {(reporte as any).actualizaciones.map((a: any) => (
                      <div key={a.id} className="flex gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{a.usuarioNombre}</span>
                          <span className="text-gray-400"> · </span>
                          <span className="text-gray-600">{a.descripcion}</span>
                          <div className="text-xs text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleString('es-AR') : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
