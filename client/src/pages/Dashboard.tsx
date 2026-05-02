import { Suspense, lazy, useState, type ReactNode } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { RoundsSummaryCard } from '../components/rounds/RoundsSummaryCard'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { ESTADOS, PRIORIDADES } from '@shared/const'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, X, PauseCircle, Download, Plus } from 'lucide-react'

const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'))
const ESTADOS_ASIGNACION = [
  { value: 'sin_asignar', label: 'Sin asignar', color: 'var(--text-3)' },
  { value: 'pendiente_confirmacion', label: 'Sin confirmar', color: 'var(--warning)' },
  { value: 'aceptada', label: 'Aceptada', color: 'var(--success)' },
  { value: 'rechazada', label: 'Rechazada', color: 'var(--danger)' },
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

const KPI_TONES: Record<string, { bg: string; color: string }> = {
  gold:  { bg: 'oklch(0.742 0.126 73 / 0.13)', color: 'var(--primary)' },
  amber: { bg: 'oklch(0.640 0.136 76 / 0.13)', color: 'var(--warning)' },
  green: { bg: 'oklch(0.512 0.118 150 / 0.13)', color: 'var(--success)' },
  rose:  { bg: 'oklch(0.532 0.174 28 / 0.12)', color: 'var(--danger)' },
  gray:  { bg: 'oklch(0.568 0.014 76 / 0.10)', color: 'var(--text-2)' },
}

function KpiCard({ label, value, tone = 'gold', icon: Icon }: any) {
  const t = KPI_TONES[tone] ?? KPI_TONES.gold
  return (
    <div className="kpi" style={{ padding: '12px 14px' }}>
      <div style={{ width: 30, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: t.bg }}>
        <Icon size={14} style={{ color: t.color }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, lineHeight: 1, margin: '4px 0 0', color: t.color }}>{value}</div>
    </div>
  )
}

const TONE_STYLES: Record<string, { background: string; color: string }> = {
  gold:  { background: 'oklch(0.742 0.126 73 / 0.12)', color: 'var(--primary)' },
  amber: { background: 'oklch(0.640 0.136 76 / 0.12)', color: 'var(--warning)' },
  green: { background: 'oklch(0.512 0.118 150 / 0.12)', color: 'var(--success)' },
  rose:  { background: 'oklch(0.532 0.174 28 / 0.11)', color: 'var(--danger)' },
  slate: { background: 'oklch(0.568 0.014 76 / 0.10)', color: 'var(--text-2)' },
  sage:  { background: 'oklch(0.545 0.088 165 / 0.11)', color: 'var(--accent)' },
}

function TeamMetric({ label, value, tone }: { label: string; value: ReactNode; tone: keyof typeof TONE_STYLES }) {
  const s = TONE_STYLES[tone]
  return (
    <div style={{ borderRadius: 8, padding: '7px 9px', background: s.background, color: s.color }}>
      <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.65, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>{value}</div>
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
          <KpiCard label="Tareas activas" value={tareasResumen.activas} tone="gold" icon={Clock} />
          <KpiCard label="Pausadas" value={tareasResumen.pausadas} tone="amber" icon={PauseCircle} />
          <KpiCard label="Terminadas hoy" value={tareasResumen.terminadasHoy} tone="green" icon={CheckCircle2} />
          <KpiCard label="Rechazadas" value={tareasResumen.rechazadasHoy} tone="rose" icon={AlertCircle} />
        </div>
      ) : null}

      {/* Hero card */}
      <div className="hero-card" style={{
        position: 'relative', overflow: 'hidden',
        marginBottom: 14,
        padding: '18px 20px',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1fr) auto',
        gap: 20,
        alignItems: 'center',
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'oklch(0.742 0.126 73 / 0.14)', border: '1px solid oklch(0.742 0.126 73 / 0.34)', color: 'oklch(0.842 0.120 78)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            Centro operativo
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'oklch(0.935 0.012 78)', lineHeight: 1.05, marginBottom: 6, letterSpacing: '-0.01em' }}>
            Mando diario de reclamos, tareas y equipo
          </div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.860 0.016 78 / 0.68)', lineHeight: 1.55, maxWidth: 560 }}>
            Lectura rápida para supervisión: abiertos, recepción, resolución y carga operativa sin salir del panel.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: 'oklch(0.112 0.018 72)', borderRadius: 4, padding: '7px 12px', fontSize: 11, fontWeight: 800, textDecoration: 'none', transition: 'all 0.16s', boxShadow: 'var(--shadow-btn-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}
            >
              <Plus size={13} />
              Nuevo reclamo
            </a>
            <button
              type="button"
              onClick={() => {
                if (!reportes.length) return
                const header = ['#', 'Locatario', 'Local', 'Categoría', 'Prioridad', 'Estado', 'Asignado', 'Fecha']
                const rows = reportes.map((r: any) => [r.id, r.locatario, r.local, r.categoria, r.prioridad, r.estado, r.asignadoA ?? '', r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-AR') : ''])
                const csv = [header, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'reclamos.csv'; a.click()
                URL.revokeObjectURL(url)
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'oklch(1 0 0 / 0.055)', border: '1px solid oklch(1 0 0 / 0.13)', color: 'oklch(0.935 0.012 78 / 0.76)', borderRadius: 4, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.16s', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}
            >
              <Download size={13} />
              Exportar
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 8, width: '100%', maxWidth: 420, minWidth: 0 }}>
          <div style={{ background: 'oklch(0.742 0.126 73 / 0.15)', border: '1px solid oklch(0.742 0.126 73 / 0.34)', borderRadius: 5, padding: '12px 14px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(0.935 0.012 78 / 0.58)', fontFamily: 'var(--font-mono)' }}>Abiertos</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, lineHeight: 1, marginTop: 4, color: 'oklch(0.935 0.012 78)' }}>{stats ? stats.abiertos : 0}</div>
            <div style={{ fontSize: 10.5, marginTop: 3, color: 'oklch(0.935 0.012 78 / 0.52)' }}>Activos ahora</div>
          </div>
          <div style={{ background: 'oklch(1 0 0 / 0.055)', border: '1px solid oklch(1 0 0 / 0.12)', borderRadius: 5, padding: '12px 14px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'oklch(0.935 0.012 78 / 0.54)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Resolución</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'oklch(0.742 0.126 73)', lineHeight: 1, marginTop: 4 }}>{stats?.tasaCompletitud ?? 0}%</div>
            <div style={{ fontSize: 10.5, marginTop: 3, color: 'oklch(0.935 0.012 78 / 0.52)' }}>Tasa vigente</div>
          </div>
          <div style={{ background: 'oklch(1 0 0 / 0.055)', border: '1px solid oklch(1 0 0 / 0.12)', borderRadius: 5, padding: '12px 14px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'oklch(0.935 0.012 78 / 0.54)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Empleados</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'oklch(0.935 0.012 78)', lineHeight: 1, marginTop: 4 }}>{empleados.length}</div>
            <div style={{ fontSize: 10.5, marginTop: 3, color: 'oklch(0.935 0.012 78 / 0.52)' }}>Equipo cargado</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-3 mb-4">
          <KpiCard label="Total" value={stats.total} tone="gold" icon={TrendingUp} />
          <KpiCard label="Pendientes" value={stats.pendientes} tone="amber" icon={Clock} />
          <KpiCard label="En progreso" value={stats.enProgreso} tone="amber" icon={AlertCircle} />
          <KpiCard label="Pausados" value={stats.pausados} tone="gray" icon={PauseCircle} />
          <KpiCard label="Completados" value={stats.completados} tone="green" icon={CheckCircle2} />
          <KpiCard label="Sin confirmar" value={stats.asignacionesPendientes} tone="amber" icon={Clock} />
          <KpiCard label="Aceptadas hoy" value={stats.asignacionesAceptadasHoy} tone="green" icon={CheckCircle2} />
          <KpiCard label="Rechazadas hoy" value={stats.asignacionesRechazadasHoy} tone="rose" icon={AlertCircle} />
          <KpiCard label="Resolución" value={`${stats.tasaCompletitud}%`} tone="gold" icon={TrendingUp} />
        </div>
      )}

      {stats?.rankingEmpleadosHoy?.length > 0 && (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Rendimiento del equipo</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Carga operativa, respuestas y horas trabajadas hoy</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.rankingEmpleadosHoy.map((empleado: any) => (
              <div key={empleado.empleadoId} className="kpi" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, marginBottom: 2 }}>Operativo</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{empleado.nombre}</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: 5, background: 'oklch(0.742 0.126 73 / 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {empleado.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 12 }}>
                  <TeamMetric label="Activas" value={empleado.tareasActivas} tone="gold" />
                  <TeamMetric label="Sin conf." value={empleado.pendientesConfirmacion} tone="amber" />
                  <TeamMetric label="Cerradas" value={empleado.completadasHoy} tone="green" />
                  <TeamMetric label="Aceptadas" value={empleado.aceptadasHoy} tone="sage" />
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
            <div className="card" style={{ padding: '14px 18px', marginBottom: 14, fontSize: 13, color: 'var(--text-3)' }}>
              Cargando gráficos operativos...
            </div>
          }
        >
          <DashboardCharts stats={stats} prioridadTotal={prioridadTotal} />
        </Suspense>
      )}

      {stats && stats.abiertos === 0 && stats.total > 0 && (
        <div className="card" style={{ padding: '20px 16px', marginBottom: 14, textAlign: 'center' }}>
          <CheckCircle2 style={{ margin: '0 auto 10px', color: 'var(--success)' }} size={28} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>No hay reclamos abiertos</h3>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-3)' }}>
            Todos los reclamos vigentes están resueltos o cerrados. La tasa de resolución actual es {stats.tasaCompletitud}%.
          </p>
        </div>
      )}

      {/* Filters + Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--gray-50)' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={filters.busqueda}
              onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
              placeholder="Buscar locatario, local o categoría…"
              style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '7px 14px 7px 34px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', outline: 'none', transition: 'all 0.15s', width: '100%', color: 'var(--text-1)' }}
            />
          </div>
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '7px 14px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filters.prioridad} onChange={e => setFilters(f => ({ ...f, prioridad: e.target.value }))}
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '7px 14px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
            <option value="">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
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
                  onMouseEnter={e => { Array.from((e.currentTarget as HTMLElement).cells).forEach(td => (td as HTMLElement).style.background = 'var(--gray-50)') }}
                  onMouseLeave={e => { Array.from((e.currentTarget as HTMLElement).cells).forEach(td => (td as HTMLElement).style.background = '') }}
                >
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>#{r.id.toString().padStart(4,'0')}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-1)' }}>{r.locatario}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>{r.local}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', textTransform: 'capitalize' }}>{r.categoria}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}><Badge value={r.prioridad} options={PRIORIDADES} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}><Badge value={r.estado} options={ESTADOS} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12 }}>{r.asignadoA ?? '—'}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}><Badge value={(r as any).asignacionEstado ?? 'sin_asignar'} options={ESTADOS_ASIGNACION} /></td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>
                    <WorkingTime seconds={(r as any).tiempoTrabajadoSegundos} isRunning={r.estado === 'en_progreso'} />
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-AR') : ''}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
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
          <div style={{ background: 'var(--surface)', width: '100%', maxWidth: 600, borderRadius: '8px 8px 0 0', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}
            className="md:rounded-lg"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 14, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, borderRadius: '8px 8px 0 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', fontWeight: 500, marginBottom: 5 }}>#{reporte.id.toString().padStart(4,'0')} · {reporte.local}</div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{reporte.titulo}</h2>
                <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge value={reporte.prioridad} options={PRIORIDADES} />
                  <Badge value={reporte.estado} options={ESTADOS} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{reporte.planta === 'baja' ? 'Planta Baja' : 'Planta Alta'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6, borderRadius: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-100)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Descripción</div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{reporte.descripcion}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--gray-50)', borderRadius: 6, padding: '14px 16px' }}>
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
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text-1)', outline: 'none' }}>
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
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', outline: 'none', color: 'var(--text-1)' }} />
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
