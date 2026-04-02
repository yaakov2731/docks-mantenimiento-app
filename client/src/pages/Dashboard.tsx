import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ESTADOS, PRIORIDADES, CATEGORIAS } from '@shared/const'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, X, Building2, PauseCircle } from 'lucide-react'

const COLORS_PIE = ['#22C55E','#EAB308','#FF6B35','#EF4444']

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
    <div className="surface-panel rounded-[28px] p-5 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-gray-500">{label}</p>
          <p className="text-3xl font-heading font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [filters, setFilters] = useState({ estado: '', prioridad: '', busqueda: '' })
  const [selected, setSelected] = useState<number|null>(null)
  const [nota, setNota] = useState('')
  const [showNota, setShowNota] = useState(false)
  const [assigningTo, setAssigningTo] = useState('')

  const { data: stats } = trpc.reportes.estadisticas.useQuery()
  const { data: reportes = [], refetch } = trpc.reportes.listar.useQuery(filters)
  const { data: reporte } = trpc.reportes.obtener.useQuery({ id: selected! }, { enabled: !!selected })
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const cambiarEstado = trpc.reportes.actualizarEstado.useMutation({ onSuccess: () => { refetch(); setSelected(null) } })
  const asignar = trpc.reportes.asignar.useMutation({ onSuccess: () => { refetch(); setAssigningTo('') } })
  const agregarNota = trpc.reportes.agregarNota.useMutation({ onSuccess: () => { refetch(); setNota(''); setShowNota(false) } })
  const prioridadTotal = stats?.porPrioridad?.reduce((acc: number, item: any) => acc + (item.count ?? 0), 0) ?? 0

  return (
    <DashboardLayout title="Dashboard">
      <div className="surface-panel-strong rounded-[32px] p-6 md:p-7 mb-6 overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(15,108,134,0.10),transparent_70%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Resumen ejecutivo
            </div>
            <h2 className="mt-3 font-heading text-2xl md:text-3xl font-bold text-sidebar-bg">
              Seguimiento operativo de mantenimiento en tiempo real
            </h2>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-600">
              Monitoreá reclamos, prioridades, avance del equipo y atención a locatarios desde un panel más claro y ejecutivo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-3xl bg-sidebar-bg p-4 text-white shadow-xl">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">Abiertos</div>
              <div className="mt-2 text-3xl font-heading font-bold">{stats ? stats.abiertos : 0}</div>
              <div className="mt-1 text-sm text-white/60">Pendientes, en curso y pausados</div>
            </div>
            <div className="rounded-3xl bg-white p-4 border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <Building2 size={14} />
                Cobertura
              </div>
              <div className="mt-2 text-3xl font-heading font-bold text-primary">{empleados.length}</div>
              <div className="mt-1 text-sm text-slate-500">Empleados registrados</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard label="Total" value={stats.total} color="#0A7EA4" icon={TrendingUp} />
          <KpiCard label="Pendientes" value={stats.pendientes} color="#EAB308" icon={Clock} />
          <KpiCard label="En Progreso" value={stats.enProgreso} color="#FF6B35" icon={AlertCircle} />
          <KpiCard label="Pausados" value={stats.pausados} color="#94A3B8" icon={PauseCircle} />
          <KpiCard label="Completados" value={stats.completados} color="#22C55E" icon={CheckCircle2} />
          <KpiCard label="Resolución" value={`${stats.tasaCompletitud}%`} color="#0A7EA4" icon={TrendingUp} />
        </div>
      )}

      {/* Charts */}
      {stats && stats.abiertos > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="surface-panel rounded-[28px] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-heading font-semibold text-lg text-gray-800">Distribución por prioridad</h3>
                <p className="text-sm text-slate-500">Lectura rápida del volumen operativo actual.</p>
              </div>
            </div>
            <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.porPrioridad}
                    dataKey="count"
                    nameKey="prioridad"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="none"
                    label={false}
                  >
                    {stats.porPrioridad.map((_: any, i: number) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any, _name: any, item: any) => [`${value}`, item.payload?.prioridad]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {stats.porPrioridad.map((item: any, index: number) => {
                  const label = PRIORIDADES.find(p => p.value === item.prioridad)?.label ?? item.prioridad
                  const percent = prioridadTotal ? Math.round((item.count / prioridadTotal) * 100) : 0
                  return (
                    <div key={item.prioridad} className="rounded-2xl bg-white/80 border border-black/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-700">{label}</div>
                          <div className="text-xs text-slate-400">{item.count} reclamos</div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading text-lg font-semibold text-slate-800">{percent}%</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="surface-panel rounded-[28px] p-5 md:p-6">
            <h3 className="font-heading font-semibold text-lg text-gray-800">Distribución por categoría</h3>
            <p className="text-sm text-slate-500 mb-4">Qué tipo de problemas se concentran entre reclamos abiertos.</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.porCategoria} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(15, 108, 134, 0.10)" />
                <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F6C86" radius={[10,10,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats && stats.abiertos === 0 && stats.total > 0 && (
        <div className="surface-panel rounded-[28px] p-8 mb-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
          <h3 className="font-heading text-xl font-semibold text-sidebar-bg">No hay reclamos abiertos</h3>
          <p className="mt-2 text-sm text-slate-500">
            Todos los reclamos vigentes están resueltos o cerrados. La tasa de resolución actual es {stats.tasaCompletitud}%.
          </p>
        </div>
      )}

      {/* Filters + Table */}
      <div className="surface-panel rounded-[28px] overflow-hidden">
        <div className="p-4 md:p-5 border-b border-black/5 flex flex-wrap gap-3 items-center bg-white/70">
          <input
            value={filters.busqueda}
            onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar locatario, local, título..."
            className="border border-gray-200 rounded-2xl px-4 py-3 text-sm flex-1 min-w-48 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            className="border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filters.prioridad} onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
            className="border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-gray-500 text-xs uppercase">
              <tr>
                {['#','Locatario','Local','Categoría','Prioridad','Estado','Asignado','Fecha','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {reportes.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay reclamos</td></tr>
              ) : reportes.map(r => (
                <tr key={r.id} className="hover:bg-white/70 cursor-pointer transition-colors" onClick={() => setSelected(r.id)}>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{r.id.toString().padStart(4,'0')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.locatario}</td>
                  <td className="px-4 py-3 text-gray-600">{r.local}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.categoria}</td>
                  <td className="px-4 py-3"><Badge value={r.prioridad} options={PRIORIDADES} /></td>
                  <td className="px-4 py-3"><Badge value={r.estado} options={ESTADOS} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.asignadoA ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.createdAt ? new Date((r.createdAt as any)*1000).toLocaleDateString('es-AR') : ''}</td>
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
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {reporte.estado !== 'completado' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'completado' })} loading={cambiarEstado.isLoading}>
                      Completar
                    </Button>
                    {reporte.estado === 'pendiente' && (
                      <Button size="sm" onClick={() => cambiarEstado.mutate({ id: reporte.id, estado: 'en_progreso' })}>
                        Iniciar
                      </Button>
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
              </div>

              {/* Assign */}
              {empleados.length > 0 && reporte.estado !== 'completado' && (
                <div className="flex gap-2">
                  <select value={assigningTo} onChange={e => setAssigningTo(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Asignar a empleado...</option>
                    {empleados.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" disabled={!assigningTo}
                    onClick={() => asignar.mutate({ id: reporte.id, empleadoNombre: assigningTo })}>
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
                          <div className="text-xs text-gray-400">{a.createdAt ? new Date(a.createdAt*1000).toLocaleString('es-AR') : ''}</div>
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
