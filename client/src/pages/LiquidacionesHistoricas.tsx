import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { BadgeCheck, CalendarRange, Filter, History, Wallet, WalletCards } from 'lucide-react'

type EstadoFiltro = 'todos' | 'cerrado' | 'pagado'
type PeriodoTipo = 'dia' | 'semana' | 'quincena' | 'mes' | ''

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ComponentType<{ size?: number }>
  tone: 'slate' | 'emerald' | 'cyan' | 'amber'
}) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  }

  return (
    <div className={`rounded-[22px] border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
          <div className="mt-2 font-heading text-3xl font-semibold leading-none">{value}</div>
        </div>
        <div className="rounded-2xl bg-white/70 p-2.5">
          <Icon size={16} />
        </div>
      </div>
      {hint && <div className="mt-3 text-xs opacity-75">{hint}</div>}
    </div>
  )
}

function periodLabel(value?: string | null) {
  if (value === 'mes') return 'Mes'
  if (value === 'quincena') return 'Quincena'
  if (value === 'semana') return 'Semana'
  if (value === 'dia') return 'Día'
  return value ?? 'Período'
}

export default function LiquidacionesHistoricas() {
  const [empleadoId, setEmpleadoId] = useState('')
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('')
  const [estado, setEstado] = useState<EstadoFiltro>('todos')

  const selectedEmpleadoId = empleadoId ? Number(empleadoId) : undefined
  const { data: empleados = [] } = trpc.empleados.listar.useQuery()
  const historial = trpc.asistencia.historialLiquidaciones.useQuery({
    empleadoId: selectedEmpleadoId,
    periodoTipo: periodoTipo || undefined,
    estado,
  })
  const marcarPagada = trpc.asistencia.marcarLiquidacionPagada.useMutation({
    onSuccess: async () => {
      await historial.refetch()
    },
    onError: (error) => {
      alert(error.message)
    },
  })

  const rows = historial.data?.rows ?? []
  const summary = historial.data?.summary

  const topPendientes = useMemo(
    () => rows.filter((row: any) => !row.pagadoAt).sort((a: any, b: any) => Number(b.totalPagar ?? 0) - Number(a.totalPagar ?? 0)).slice(0, 5),
    [rows]
  )

  return (
    <DashboardLayout title="Liquidaciones Históricas">
      {/* Dark hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #162032 40%, #1a2e50 100%)',
        borderRadius: 22, padding: 28,
        position: 'relative', overflow: 'hidden',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, background: 'radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, minWidth: 260, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(37,99,235,0.20)', border: '1px solid rgba(37,99,235,0.35)', color: '#93C5FD', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Historial administrativo
          </div>
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
            Liquidaciones cerradas<br />y pagadas
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, maxWidth: 480 }}>
            Revisá períodos procesados, detectá pagos pendientes y marcá liquidaciones como abonadas.
          </div>
        </div>

        {summary && (
          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '16px 20px', minWidth: 140 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Total</div>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 700, lineHeight: 1, marginTop: 4, color: '#fff' }}>{formatCurrency(summary.totalCerrado)}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: 'rgba(255,255,255,0.45)' }}>Todos los períodos</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pagado</div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#10B981', lineHeight: 1, marginTop: 3 }}>{formatCurrency(summary.totalPagado)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>Liquidaciones abonadas</div>
              </div>
              <div style={{ background: 'rgba(217,119,6,0.20)', border: '1px solid rgba(217,119,6,0.35)', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pendiente</div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#F59E0B', lineHeight: 1, marginTop: 3 }}>{formatCurrency(summary.totalPendiente)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>{summary.cierresPendientes} liquidaciones</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}
          style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
          <option value="">Todo el equipo</option>
          {empleados.map((empleado: any) => (
            <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>
          ))}
        </select>
        <select value={periodoTipo} onChange={e => setPeriodoTipo(e.target.value as PeriodoTipo)}
          style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
          <option value="">Todos los períodos</option>
          <option value="dia">Día</option>
          <option value="semana">Semana</option>
          <option value="quincena">Quincena</option>
          <option value="mes">Mes</option>
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value as EstadoFiltro)}
          style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
          <option value="todos">Todos los estados</option>
          <option value="cerrado">Pendientes de pago</option>
          <option value="pagado">Pagados</option>
        </select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Registros" value={summary?.totalRegistros ?? 0} hint="Liquidaciones encontradas" icon={History} tone="slate" />
        <SummaryCard label="Total cerrado" value={formatCurrency(summary?.totalCerrado ?? 0)} hint="Monto histórico del filtro" icon={CalendarRange} tone="cyan" />
        <SummaryCard label="Total pagado" value={formatCurrency(summary?.totalPagado ?? 0)} hint={`${summary?.cierresPagados ?? 0} liquidaciones`} icon={BadgeCheck} tone="emerald" />
        <SummaryCard label="Pendiente" value={formatCurrency(summary?.totalPendiente ?? 0)} hint={`${summary?.cierresPendientes ?? 0} liquidaciones`} icon={Wallet} tone="amber" />
      </div>

      <div className="grid 2xl:grid-cols-[1.55fr_0.95fr] gap-4">
        <div className="surface-panel rounded-[24px] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-primary" />
            <div>
              <h3 className="font-heading font-semibold text-base text-gray-800">Historial de cierres</h3>
              <p className="text-[13px] text-slate-500">Listado cronológico de liquidaciones con estado administrativo.</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-200 p-8 text-center text-slate-500">
              No hay liquidaciones históricas para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row: any) => (
                <div key={row.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-heading text-lg font-semibold text-slate-800">{row.empleadoNombre}</div>
                      <div className="text-xs text-slate-500">{row.especialidad || 'Mantenimiento general'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${row.pagadoAt ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.pagadoAt ? <WalletCards size={12} /> : <BadgeCheck size={12} />}
                        {row.pagadoAt ? 'Pagado' : 'Cerrado'}
                      </span>
                      <div className="text-[11px] text-slate-500">{periodLabel(row.periodoTipo)}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 gap-3 mt-4">
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Rango</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{row.periodoDesde} a {row.periodoHasta}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Horas</div>
                      <div className="mt-1 text-sm font-medium text-slate-800"><WorkingTime seconds={row.segundosTrabajados ?? 0} /></div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Días</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{row.diasTrabajados ?? 0}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Tarifa</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{formatCurrency(row.tarifaMonto ?? 0)} · {periodLabel(row.tarifaPeriodo)}</div>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                      <div className="text-[11px] text-slate-500">Total</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(row.totalPagar ?? 0)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Cerrado por {row.cerradoPorNombre} · {formatDateTime(row.closedAt)}
                    {row.pagadoAt ? ` · Pagado por ${row.pagadoPorNombre} el ${formatDateTime(row.pagadoAt)}` : ''}
                  </div>

                  {!row.pagadoAt && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={marcarPagada.isLoading && marcarPagada.variables?.closureId === row.id}
                        onClick={() => {
                          if (!window.confirm(`¿Marcar como pagada la liquidación de ${row.empleadoNombre}?`)) return
                          marcarPagada.mutate({ closureId: row.id })
                        }}
                      >
                        <WalletCards size={13} />
                        Marcar pagada
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Pendientes más altos</h3>
                <p className="text-[13px] text-slate-500">Liquidaciones cerradas todavía sin pago.</p>
              </div>
            </div>

            {topPendientes.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 p-6 text-center text-slate-500">
                No hay pendientes para este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {topPendientes.map((row: any) => (
                  <div key={row.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-800">{row.empleadoNombre}</div>
                        <div className="text-xs text-slate-500">{periodLabel(row.periodoTipo)} · {row.periodoDesde} a {row.periodoHasta}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-lg font-semibold text-slate-800">{formatCurrency(row.totalPagar ?? 0)}</div>
                        <div className="text-[11px] text-slate-500">{row.diasTrabajados ?? 0} días</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Estado del circuito</h3>
                <p className="text-[13px] text-slate-500">Lectura rápida del proceso administrativo.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Cerradas pendientes</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{summary?.cierresPendientes ?? 0}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Pagadas</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{summary?.cierresPagados ?? 0}</div>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Importe pendiente</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">{formatCurrency(summary?.totalPendiente ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
