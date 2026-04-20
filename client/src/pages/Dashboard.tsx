import { Suspense, lazy, useState, type ReactNode } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { RoundsSummaryCard } from '../components/rounds/RoundsSummaryCard'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { ESTADOS, PRIORIDADES } from '@shared/const'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, X, PauseCircle } from 'lucide-react'

const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'))
const ESTADOS_ASIGNACION = [
  { value: 'sin_asignar', label: 'Sin asignar', color: '#6B7280' },
  { value: 'pendiente_confirmacion', label: 'Sin confirmar', color: '#D97706' },
  { value: 'aceptada', label: 'Aceptada', color: '#059669' },
  { value: 'rechazada', label: 'Rechazada', color: '#DC2626' },
] as const

function Badge({ value, options }: { value: string; options: readonly { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)
  const color = opt?.color ?? '#64748B'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 500,
      background: `${color}18`, color,
      border: `1px solid ${color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {opt?.label ?? value}
    </span>
  )
}

function KpiCard({ label, value, color, icon: Icon }: any) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 16, padding: 16,
      boxShadow: 'var(--shadow-card)',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: `${color}14` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 30, fontWeight: 700, lineHeight: 1, margin: '6px 0 0', color }}>{value}</div>
    </div>
  )
}

const TONE_STYLES: Record<string, { background: string; color: string }> = {
  blue:  { background: '#EFF6FF', color: '#2563EB' },
  amber: { background: '#FFFBEB', color: '#D97706' },
  green: { background: '#ECFDF5', color: '#059669' },
  rose:  { background: '#FFF1F2', color: '#DC2626' },
  slate: { background: '#F8FAFC', color: '#475569' },
  cyan:  { background: '#ECFEFF', color: '#0891B2' },
}

function TeamMetric({ label, value, tone }: { label: string; value: ReactNode; tone: keyof typeof TONE_STYLES }) {
  const s = TONE_STYLES[tone]
  return (
    <div style={{ borderRadius: 10, padding: '9px 10px', background: s.background, color: s.color }}>
      <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.65, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, marginTop: 3, lineHeight: 1 }}>{value}</div>
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
  const { data: user } = trpc.auth.me.useQuery()
  const isAdmin = user?.role === 'admin'
  const eliminarReporte = trpc.reportes.eliminar.useMutation({
    onSuccess: () => {
      refetch()
      setSelected(null)
    },
  })
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

      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #162032 40%, #1a2e50 100%)',
        borderRadius: 22, padding: 28,
        position: 'relative', overflow: 'hidden',
        marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, background: 'radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, minWidth: 260, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(37,99,235,0.20)', border: '1px solid rgba(37,99,235,0.35)', color: '#93C5FD', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            En vivo
          </div>
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
            Seguimiento operativo<br />en tiempo real
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, maxWidth: 480 }}>
            Monitoreá reclamos, prioridades y el rendimiento del equipo desde un panel ejecutivo centralizado.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.35)', borderRadius: 16, padding: '16px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Abiertos</div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, lineHeight: 1, marginTop: 4, color: '#fff' }}>{stats ? stats.abiertos : 0}</div>
            <div style={{ fontSize: 11, marginTop: 3, color: 'rgba(255,255,255,0.45)' }}>Activos ahora</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RESOLUCIÓN</div>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#10B981', lineHeight: 1, marginTop: 3 }}>{stats?.tasaCompletitud ?? 0}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EMPLEADOS</div>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1, marginTop: 3 }}>{empleados.length}</div>
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
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 22, padding: 20, marginBottom: 18, boxShadow: 'var(--shadow-card-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Rendimiento del equipo</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Carga operativa, respuestas y horas trabajadas hoy</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.rankingEmpleadosHoy.map((empleado: any) => (
              <div key={empleado.empleadoId} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-card)', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, marginBottom: 2 }}>Operativo</div>
                    <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{empleado.nombre}</div>
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#ECFEFF', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {empleado.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 12 }}>
                  <TeamMetric label="Activas" value={empleado.tareasActivas} tone="blue" />
                  <TeamMetric label="Sin conf." value={empleado.pendientesConfirmacion} tone="amber" />
                  <TeamMetric label="Cerradas" value={empleado.completadasHoy} tone="green" />
                  <TeamMetric label="Aceptadas" value={empleado.aceptadasHoy} tone="cyan" />
                  <TeamMetric label="Rechaz." value={empleado.rechazadasHoy} tone="rose" />
                  <TeamMetric label="Horas" value={<WorkingTime seconds={empleado.horasTrabajadasHoySegundos} />} tone="slate" />
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
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 22, padding: 20, marginBottom: 18, fontSize: 13, color: 'var(--text-3)' }}>
              Cargando gráficos operativos...
            </div>
          }
        >
          <DashboardCharts stats={stats} prioridadTotal={prioridadTotal} />
        </Suspense>
      )}

      {stats && stats.abiertos === 0 && stats.total > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 22, padding: '28px 20px', marginBottom: 18, textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <CheckCircle2 style={{ margin: '0 auto 12px', color: 'var(--success)' }} size={36} />
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>No hay reclamos abiertos</h3>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-3)' }}>
            Todos los reclamos vigentes están resueltos o cerrados. La tasa de resolución actual es {stats.tasaCompletitud}%.
          </p>
        </div>
      )}

      {/* Filters + Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-card-strong)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#FAFBFC' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={filters.busqueda}
              onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
              placeholder="Buscar locatario, local o categoría…"
              style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px 7px 34px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', transition: 'all 0.15s', width: '100%', color: 'var(--text-1)' }}
            />
          </div>
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filters.prioridad} onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
            style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['#','Locatario','Local','Categoría','Prioridad','Estado','Asignado','Recepción','Tiempo','Fecha','Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>No hay reclamos</td></tr>
              ) : reportes.map(r => (
                <tr key={r.id} style={{ transition: 'background 0.12s', cursor: 'pointer' }}
                  onClick={() => setSelected(r.id)}
                  onMouseEnter={e => { Array.from((e.currentTarget as HTMLElement).cells).forEach(td => (td as HTMLElement).style.background = '#F8FAFC') }}
                  onMouseLeave={e => { Array.from((e.currentTarget as HTMLElement).cells).forEach(td => (td as HTMLElement).style.background = '') }}
                >
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>#{r.id.toString().padStart(4,'0')}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', fontWeight: 600, color: 'var(--text-1)' }}>{r.locatario}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', color: 'var(--text-2)' }}>{r.local}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', color: 'var(--text-2)', textTransform: 'capitalize' }}>{r.categoria}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)' }}><Badge value={r.prioridad} options={PRIORIDADES} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)' }}><Badge value={r.estado} options={ESTADOS} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', color: 'var(--text-2)', fontSize: 12 }}>{r.asignadoA ?? '—'}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)' }}><Badge value={(r as any).asignacionEstado ?? 'sin_asignar'} options={ESTADOS_ASIGNACION} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>
                    <WorkingTime seconds={(r as any).tiempoTrabajadoSegundos} isRunning={r.estado === 'en_progreso'} />
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)', color: 'var(--text-3)', fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-AR') : ''}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={e => { e.stopPropagation(); window.open(`/imprimir?id=${r.id}`, '_blank') }}>Imprimir</button>
                      {isAdmin && (
                        <button style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={e => { e.stopPropagation(); if (window.confirm('¿Eliminar este reclamo demo? Esta acción no se puede deshacer.')) { eliminarReporte.mutate({ id: r.id }) } }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      {selected && reporte && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
          className="md:items-center md:p-6"
          onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 600, borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}
            className="md:rounded-[24px]"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 14, position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '24px 24px 0 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', fontWeight: 500, marginBottom: 5 }}>#{reporte.id.toString().padStart(4,'0')} · {reporte.local}</div>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{reporte.titulo}</h2>
                <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge value={reporte.prioridad} options={PRIORIDADES} />
                  <Badge value={reporte.estado} options={ESTADOS} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{reporte.planta === 'baja' ? 'Planta Baja' : 'Planta Alta'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6, borderRadius: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Descripción</div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{reporte.descripcion}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#F8FAFC', borderRadius: 14, padding: '14px 16px' }}>
                <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Locatario</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{reporte.locatario}</div></div>
                <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Categoría</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textTransform: 'capitalize' }}>{reporte.categoria}</div></div>
                {reporte.contacto && <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Teléfono</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{reporte.contacto}</div></div>}
                {reporte.asignadoA && <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Asignado a</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{reporte.asignadoA}</div></div>}
                <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Recepción</div><Badge value={(reporte as any).asignacionEstado ?? 'sin_asignar'} options={ESTADOS_ASIGNACION} /></div>
                <div><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 3 }}>Tiempo trabajado</div>
                  <WorkingTime seconds={(reporte as any).tiempoTrabajadoSegundos} isRunning={reporte.estado === 'en_progreso'} className="font-medium" />
                </div>
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Acciones</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
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
                {isAdmin ? (
                  <Button size="sm" variant="destructive"
                    onClick={() => { if (window.confirm('¿Eliminar este reclamo demo? Esta acción no se puede deshacer.')) { eliminarReporte.mutate({ id: reporte.id }) } }}
                    loading={eliminarReporte.isLoading}>
                    Eliminar reclamo
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" loading={crearTareaDesdeReclamo.isLoading}
                  onClick={() => crearTareaDesdeReclamo.mutate({ reporteId: reporte.id, tipoTrabajo: reporte.categoria, empleadoId: empleadoSeleccionado?.id })}>
                  Crear trabajo operativo
                </Button>
              </div>
              </div>

              {/* Assign */}
              {empleados.length > 0 && reporte.estado !== 'completado' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={assigningTo} onChange={e => setAssigningTo(e.target.value)}
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text-1)', outline: 'none' }}>
                    <option value="">Asignar a empleado...</option>
                    {empleados.map((empleado: any) => (
                      <option key={empleado.id} value={empleado.id}>{empleado.nombre}{empleado.waId ? '' : ' · sin WhatsApp'}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="secondary" disabled={!empleadoSeleccionado}
                    onClick={() => { if (!empleadoSeleccionado) return; asignar.mutate({ id: reporte.id, empleadoId: empleadoSeleccionado.id, empleadoNombre: empleadoSeleccionado.nombre }) }}>
                    Asignar
                  </Button>
                </div>
              )}

              {/* Note */}
              {showNota ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Escribí una nota..."
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: '#fff', outline: 'none' }} />
                  <Button size="sm" disabled={!nota} onClick={() => agregarNota.mutate({ id: reporte.id, nota })} loading={agregarNota.isLoading}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNota(false)}>Cancelar</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowNota(true)}>+ Agregar nota</Button>
              )}

              {/* History */}
              {(reporte as any).actualizaciones?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Historial</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(reporte as any).actualizaciones.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: 'var(--text-1)' }}><strong>{a.usuarioNombre}</strong> <span style={{ color: 'var(--text-3)' }}>{a.descripcion}</span></div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString('es-AR') : ''}</div>
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
