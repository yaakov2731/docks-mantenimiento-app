import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ESTADOS, PRIORIDADES, CATEGORIAS } from '@shared/const'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Zap, X } from 'lucide-react'

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
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-heading font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
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

  return (
    <DashboardLayout title="Dashboard">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard label="Total" value={stats.total} color="#0A7EA4" icon={TrendingUp} />
          <KpiCard label="Pendientes" value={stats.pendientes} color="#EAB308" icon={Clock} />
          <KpiCard label="En Progreso" value={stats.enProgreso} color="#FF6B35" icon={AlertCircle} />
          <KpiCard label="Completados" value={stats.completados} color="#22C55E" icon={CheckCircle2} />
          <KpiCard label="Urgentes" value={stats.urgentes} color="#EF4444" icon={Zap} />
          <KpiCard label="Completitud" value={`${stats.tasaCompletitud}%`} color="#0A7EA4" icon={TrendingUp} />
        </div>
      )}

      {/* Charts */}
      {stats && stats.total > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-heading font-semibold text-sm mb-4 text-gray-700">Por Prioridad</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.porPrioridad} dataKey="count" nameKey="prioridad" cx="50%" cy="50%" outerRadius={70} label={({ prioridad, percent }) => `${prioridad} ${(percent*100).toFixed(0)}%`}>
                  {stats.porPrioridad.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-heading font-semibold text-sm mb-4 text-gray-700">Por Categoría</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.porCategoria}>
                <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0A7EA4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <input
            value={filters.busqueda}
            onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar locatario, local, título..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filters.prioridad} onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['#','Locatario','Local','Categoría','Prioridad','Estado','Asignado','Fecha','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportes.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay reclamos</td></tr>
              ) : reportes.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r.id)}>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{r.id.toString().padStart(4,'0')}</td>
                  <td className="px-4 py-3 font-medium">{r.locatario}</td>
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
          <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
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
