import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { attendanceActionLabel, attendanceActionTone, attendanceChannelLabel, getAttendanceEventDateTime } from '../lib/attendancePresentation'
import { exportarAsistenciaExcel } from '../lib/exportAttendanceExcel'
import {
  Activity,
  BadgeCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Printer,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  UserRound,
  Wallet,
  WalletCards,
} from 'lucide-react'

type Periodo = 'dia' | 'semana' | 'quincena' | 'mes'
type AttendanceAction = 'entrada' | 'inicio_almuerzo' | 'fin_almuerzo' | 'salida'

const periodOptions: { value: Periodo; label: string; hint: string }[] = [
  { value: 'dia', label: 'Hoy', hint: 'Control operativo del día' },
  { value: 'semana', label: 'Semana', hint: 'Resumen semanal' },
  { value: 'quincena', label: 'Quincena', hint: 'Liquidación quincenal' },
  { value: 'mes', label: 'Mes', hint: 'Liquidación mensual' },
]

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin registro'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatFullDate(value: Date) {
  return value.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function ratePeriodLabel(value?: string | null) {
  if (value === 'semana') return 'Semanal'
  if (value === 'quincena') return 'Quincenal'
  if (value === 'mes') return 'Mensual'
  return 'Diario'
}

function appliedRateHint(liquidacion?: any) {
  if (!liquidacion) return 'Sin escala configurada'
  const origen = liquidacion.tarifaOrigen === 'configurado'
    ? 'Tarifa exacta configurada'
    : liquidacion.tarifaOrigen === 'derivado'
      ? 'Calculado desde otra escala disponible'
      : liquidacion.tarifaOrigen === 'cierre'
        ? 'Tarifa congelada al cerrar la liquidación'
        : 'Sin escala configurada'
  return `${ratePeriodLabel(liquidacion.tarifaPeriodo)} · ${origen}`
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone: 'cyan' | 'green' | 'amber' | 'slate' | 'emerald'
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const tones = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    emerald: 'border-teal-200 bg-teal-50 text-teal-800',
  }

  return (
    <div className={`rounded-[22px] border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</div>
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

function groupTurnsByDay(turns: any[]) {
  const sorted = [...turns].sort((left, right) => {
    const leftMs = new Date(left.entradaAt ?? 0).getTime()
    const rightMs = new Date(right.entradaAt ?? 0).getTime()
    return rightMs - leftMs
  })
  const groups = new Map<string, { fecha: string; etiqueta: string; turnos: any[] }>()
  for (const turn of sorted) {
    const key = String(turn.fecha ?? 'sin-fecha')
    const existing = groups.get(key)
    if (existing) {
      existing.turnos.push(turn)
      continue
    }
    groups.set(key, {
      fecha: key,
      etiqueta: turn.etiqueta ?? key,
      turnos: [turn],
    })
  }
  return [...groups.values()]
}

const DAY_MS = 24 * 60 * 60 * 1000

function getAttendanceDateKey(ms: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

function getPeriodHeaders(periodo?: any) {
  if (!periodo?.startMs || !periodo?.endMs) return []
  const headers = []
  for (let cursor = periodo.startMs; cursor < periodo.endMs; cursor += DAY_MS) {
    headers.push({
      key: getAttendanceDateKey(cursor),
      label: new Date(cursor).toLocaleDateString('es-AR', { day: '2-digit', weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }),
    })
  }
  return headers
}

function renderAttendanceDayCell(day: any) {
  if (!day) {
    return <span className="text-slate-400">–</span>
  }
  const worked = day.workedSeconds ?? 0
  const hasAny = day.entradas || day.salidas || day.iniciosAlmuerzo || day.finesAlmuerzo
  if (!hasAny) {
    return <span className="text-slate-400">–</span>
  }
  return (
    <div className="space-y-0.5 text-[11px] leading-tight">
      <div className={worked > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
        {worked > 0 ? '✔' : '•'} {worked > 0 ? <WorkingTime seconds={worked} /> : 'Registro'}
      </div>
      <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
        {(day.entradas ?? 0) > 1 ? <span title="Entradas múltiples" className="rounded-full bg-amber-100 text-amber-700 px-1.5">×{day.entradas} ent.</span> : null}
        {(day.salidas ?? 0) > 1 ? <span title="Salidas múltiples" className="rounded-full bg-amber-100 text-amber-700 px-1.5">×{day.salidas} sal.</span> : null}
        {(day.iniciosAlmuerzo ?? 0) > 0 && (day.finesAlmuerzo ?? 0) === 0 ? <span title="Almuerzo sin cierre" className="rounded-full bg-orange-100 text-orange-700 px-1.5">alm. abierto</span> : null}
      </div>
    </div>
  )
}

function TurnChip({ turn }: { turn: any }) {
  const active = !!turn.turnoAbierto
  return (
    <div
      className={`min-w-[78px] rounded-2xl border px-3 py-2 ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide opacity-70">
        {formatTime(turn.entradaAt)} · {turn.turnoAbierto ? 'Abierto' : formatTime(turn.salidaAt)}
      </div>
      <div className="mt-1 text-xs font-medium">
        <WorkingTime seconds={turn.workedSeconds ?? 0} />
      </div>
      <div className="mt-1 text-[10px] opacity-70">
        Almuerzo <WorkingTime seconds={turn.lunchSeconds ?? 0} />
      </div>
    </div>
  )
}

export default function Asistencia() {
  const [periodo, setPeriodo] = useState<Periodo>('dia')
  const [referenceMs, setReferenceMs] = useState(() => Date.now())
  const [empleadoId, setEmpleadoId] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const { data: catalogoEmpleados = [] } = trpc.empleados.listar.useQuery()
  const selectedEmpleadoId = empleadoId ? Number(empleadoId) : undefined

  const resumen = trpc.asistencia.resumen.useQuery({ periodo, empleadoId: selectedEmpleadoId, referenceDateMs: referenceMs }, { refetchInterval: 15000 })
  const registrar = trpc.asistencia.registrar.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
    },
    onError: (error) => {
      alert(error.message)
    },
  })
  const cerrarLiquidacion = trpc.asistencia.cerrarLiquidacion.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
      alert('Liquidación cerrada y congelada correctamente.')
    },
    onError: (error) => {
      alert(error.message)
    },
  })
  const marcarPagado = trpc.asistencia.marcarPagado.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
      alert('Liquidación marcada como pagada.')
    },
    onError: (error) => {
      alert(error.message)
    },
  })

  const empleados = resumen.data?.empleados ?? []
  const eventos = resumen.data?.eventos ?? []
  const equipo = resumen.data?.resumenEquipo
  const periodoInfo = resumen.data?.periodo
  const cierre = resumen.data?.cierre

  const rankingLiquidacion = useMemo(
    () => [...empleados].sort((a: any, b: any) => (b.liquidacion?.totalPagar ?? 0) - (a.liquidacion?.totalPagar ?? 0)),
    [empleados]
  )

  const canExport = !!resumen.data && empleados.length > 0

  const periodHeaders = useMemo(() => getPeriodHeaders(periodoInfo), [periodoInfo])
  const attendanceMatrix = useMemo(() => {
    return empleados.map((empleado: any) => ({
      ...empleado,
      dailyByFecha: new Map((empleado.liquidacion?.dias ?? []).map((dia: any) => [dia.fecha, dia])),
    }))
  }, [empleados])

  const digitalTime = now.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <DashboardLayout title="Asistencia y Jornales">
      <div className="surface-panel-strong rounded-[28px] p-5 md:p-6 mb-4 overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(10,126,164,0.08),transparent_72%)] pointer-events-none" />
        <div className="relative grid xl:grid-cols-[1.45fr_0.9fr] gap-4 items-stretch">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              Gestión integral del personal
            </div>
            <h2 className="mt-3 font-heading text-[22px] md:text-[28px] leading-tight font-semibold text-sidebar-bg">
              Asistencia, control horario y cálculo de jornales en un mismo tablero
            </h2>
            <p className="mt-3 max-w-3xl text-[13px] md:text-sm text-slate-600">
              Registrá entradas y salidas en forma manual o desde WhatsApp, seguí quién está en turno en tiempo real y liquidá
              el pago diario, semanal, quincenal o mensual del equipo de mantenimiento.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {periodOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setPeriodo(option.value); setReferenceMs(Date.now()) }}
                  className={`rounded-2xl border px-4 py-2 text-left transition-all ${
                    periodo === option.value
                      ? 'border-primary bg-primary text-white shadow-[0_8px_18px_rgba(10,126,164,0.18)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40'
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className={`text-[11px] ${periodo === option.value ? 'text-white/75' : 'text-slate-500'}`}>{option.hint}</div>
                </button>
              ))}
            </div>

            {/* Navegación de períodos anteriores */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (periodoInfo) setReferenceMs(periodoInfo.startMs - 1) }}
                disabled={!periodoInfo}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-[12px] text-slate-500 font-medium min-w-[160px] text-center">
                {periodoInfo ? `${periodoInfo.desde} → ${periodoInfo.hasta}` : '…'}
              </span>
              <button
                type="button"
                onClick={() => { if (periodoInfo) setReferenceMs(periodoInfo.endMs + 1) }}
                disabled={!periodoInfo || periodoInfo.endMs > Date.now()}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40"
              >
                Siguiente <ChevronRight size={14} />
              </button>
              {referenceMs < Date.now() - 86_400_000 && (
                <button
                  type="button"
                  onClick={() => setReferenceMs(Date.now())}
                  className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 transition-all"
                >
                  Hoy
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <select
                value={empleadoId}
                onChange={e => setEmpleadoId(e.target.value)}
                className="min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Todo el equipo</option>
                {catalogoEmpleados.map((empleado: any) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={!canExport}
                onClick={async () => {
                  if (!resumen.data) return
                  await exportarAsistenciaExcel({
                    periodo: resumen.data.periodo,
                    empleados: resumen.data.empleados,
                    eventos: resumen.data.eventos,
                    resumenEquipo: resumen.data.resumenEquipo,
                    cierre: resumen.data.cierre,
                  })
                }}
              >
                <FileSpreadsheet size={14} />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                disabled={!canExport}
                onClick={() => window.open(`/asistencia/imprimir?periodo=${periodo}${selectedEmpleadoId ? `&empleadoId=${selectedEmpleadoId}` : ''}`, '_blank')}
              >
                <Printer size={14} />
                Imprimir / PDF
              </Button>
              <Button
                variant="success"
                disabled={!canExport || cerrarLiquidacion.isLoading}
                loading={cerrarLiquidacion.isLoading}
                onClick={() => {
                  const scope = selectedEmpleadoId ? 'este empleado' : 'todo el equipo'
                  if (!window.confirm(`¿Cerrar la liquidación de ${scope} para ${periodoInfo?.label?.toLowerCase() ?? 'este período'}?`)) return
                  cerrarLiquidacion.mutate({ periodo, empleadoId: selectedEmpleadoId })
                }}
              >
                <BadgeCheck size={14} />
                Cerrar liquidación
              </Button>
              <Button
                variant="secondary"
                disabled={!cierre?.cerrado || cierre?.pagado || marcarPagado.isLoading}
                loading={marcarPagado.isLoading}
                onClick={() => {
                  const scope = selectedEmpleadoId ? 'este empleado' : 'todo el equipo'
                  if (!window.confirm(`¿Marcar como pagada la liquidación de ${scope}?`)) return
                  marcarPagado.mutate({ periodo, empleadoId: selectedEmpleadoId })
                }}
              >
                <WalletCards size={14} />
                Marcar pagado
              </Button>
            </div>

            {cierre?.cerrado && (
              <div className={`mt-4 rounded-[22px] border px-4 py-3 ${cierre.pagado ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/70 p-2">
                    {cierre.pagado ? <WalletCards size={16} /> : <BadgeCheck size={16} />}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {cierre.pagado ? 'Liquidación pagada' : 'Liquidación cerrada'}
                      {selectedEmpleadoId ? ' para el empleado seleccionado' : ' para este período'}.
                    </div>
                    <div className="mt-1 text-sm opacity-80">
                      {cierre.closedAt ? `Cerrada el ${formatDateTime(cierre.closedAt)}` : ''}{cierre.closedBy ? ` por ${cierre.closedBy}` : ''}.
                      {' '}Total congelado: {formatCurrency(cierre.totalPagado ?? 0)}.
                      {cierre.pagadoAt ? ` Pagada el ${formatDateTime(cierre.pagadoAt)}` : ''}{cierre.paidBy ? ` por ${cierre.paidBy}` : ''}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Período</div>
                <div className="mt-2 font-heading text-xl font-semibold text-slate-800">{periodoInfo?.label ?? 'Cargando...'}</div>
                <div className="mt-1 text-xs text-slate-500">{periodoInfo ? `${periodoInfo.desde} a ${periodoInfo.hasta}` : 'Sin rango'}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Interacción</div>
                <div className="mt-2 font-heading text-xl font-semibold text-slate-800">Bot + Panel</div>
                <div className="mt-1 text-xs text-slate-500">Las marcaciones se reflejan desde WhatsApp y desde administración.</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Última actualización</div>
                <div className="mt-2 font-heading text-xl font-semibold text-slate-800">{formatTime(now.toISOString())}</div>
                <div className="mt-1 text-xs text-slate-500">Refresco automático cada 15 segundos.</div>
              </div>
            </div>
          </div>

          {/* Columna derecha: clock + relojes del equipo correctamente agrupados */}
          <div className="flex flex-col gap-4">

            {/* Reloj central */}
            <div className="rounded-[18px] text-white overflow-hidden" style={{ background: 'var(--sidebar-bg)', boxShadow: '0 4px 20px oklch(0 0 0 / 0.18), 0 1px 0 oklch(1 0 0 / 0.10)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.30em] font-semibold" style={{ color: 'oklch(1 0 0 / 0.45)' }}>Reloj central</div>
                  <div className="text-[11px] mt-0.5 font-light" style={{ color: 'oklch(1 0 0 / 0.38)' }}>Control administrativo</div>
                </div>
                <div className="rounded-full p-2" style={{ background: 'oklch(1 0 0 / 0.08)', border: '1px solid oklch(1 0 0 / 0.12)' }}>
                  <Clock3 size={13} style={{ color: 'oklch(1 0 0 / 0.55)' }} />
                </div>
              </div>

              <div className="mx-5" style={{ height: '1px', background: 'oklch(1 0 0 / 0.08)' }} />

              {/* Clock — tamaño fijo proporcional, centrado */}
              <div className="flex flex-col items-center justify-center px-5 py-8 gap-2">
                <span
                  className="font-mono font-bold leading-none tabular-nums w-full text-center"
                  style={{ fontSize: '52px', color: 'white', letterSpacing: '-0.02em' }}
                >
                  {digitalTime}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-center mt-1" style={{ color: 'oklch(1 0 0 / 0.45)' }}>
                  {formatFullDate(now)}
                </span>
              </div>

              <div style={{ height: '1px', background: 'oklch(1 0 0 / 0.08)' }} />

              {/* KPIs */}
              <div className="grid grid-cols-2">
                <div className="px-5 py-3.5" style={{ borderRight: '1px solid oklch(1 0 0 / 0.08)' }}>
                  <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'oklch(1 0 0 / 0.42)' }}>En turno</div>
                  <div className="mt-1.5 font-heading text-2xl font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{equipo?.enTurno ?? 0}</div>
                </div>
                <div className="px-5 py-3.5">
                  <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'oklch(1 0 0 / 0.42)' }}>A pagar</div>
                  <div className="mt-1.5 font-heading text-base font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{formatCurrency(equipo?.totalPagar ?? 0)}</div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'oklch(1 0 0 / 0.08)' }} />

              <div className="px-4 py-3">
                <Button
                  variant="outline"
                  onClick={() => resumen.refetch()}
                  disabled={resumen.isFetching}
                  className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 text-[12px] h-8"
                >
                  <RefreshCw size={12} className={resumen.isFetching ? 'animate-spin' : ''} />
                  Actualizar tablero
                </Button>
              </div>
            </div>

            {/* Relojes del equipo */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Relojes del equipo</div>
                  <div className="mt-1 text-sm text-slate-500">Vista rápida de quién está en turno o almuerzo.</div>
                </div>
                <Clock3 size={18} className="text-primary" />
              </div>
              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {empleados.map((empleado: any) => {
                  const onShift = !!empleado.attendance?.onShift
                  const onLunch = !!empleado.attendance?.onLunch
                  const statusLabel = onLunch ? 'Almuerzo' : onShift ? 'En servicio' : 'Fuera de turno'
                  const statusTone = onLunch ? 'bg-amber-100 text-amber-700' : onShift ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  const currentSeconds = onLunch
                    ? empleado.attendance?.currentLunchSeconds ?? 0
                    : onShift
                      ? empleado.attendance?.currentShiftSeconds ?? 0
                      : 0
                  return (
                    <div key={empleado.empleadoId} className="rounded-[14px] border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{empleado.nombre}</div>
                          <div className="text-[11px] text-slate-500">{empleado.especialidad || 'Mantenimiento general'}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>{statusLabel}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <div>{currentSeconds > 0 ? <><span className="font-semibold text-slate-700"><WorkingTime seconds={currentSeconds} /></span> en reloj</> : 'Sin turno abierto'}</div>
                        <div>{empleado.attendance?.lastActionAt ? formatTime(empleado.attendance.lastActionAt) : 'N/A'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
        <SummaryCard
          label="Personal activo"
          value={equipo?.empleadosActivos ?? 0}
          hint="Base del equipo de mantenimiento"
          tone="slate"
          icon={UserRound}
        />
        <SummaryCard
          label="En servicio"
          value={equipo?.enTurno ?? 0}
          hint="Con turno abierto en este momento"
          tone="green"
          icon={ShieldCheck}
        />
        <SummaryCard
          label="Horas del período"
          value={<WorkingTime seconds={equipo?.horasPeriodoSegundos ?? 0} />}
          hint="Carga total registrada"
          tone="cyan"
          icon={Clock3}
        />
        <SummaryCard
          label="Jornales liquidados"
          value={equipo?.diasLiquidados ?? 0}
          hint="Días computados para pago"
          tone="emerald"
          icon={CalendarRange}
        />
        <SummaryCard
          label="Total a pagar"
          value={formatCurrency(equipo?.totalPagar ?? 0)}
          hint={`${equipo?.pendientesConfirmacion ?? 0} asignaciones por confirmar`}
          tone="amber"
          icon={Wallet}
        />
      </div>

      <div className="surface-panel rounded-[24px] p-4 mb-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading font-semibold text-lg text-gray-900">Control mensual de asistencia</h3>
            <p className="text-sm text-slate-500">Registro día a día para todo el período seleccionado.</p>
          </div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
            {periodoInfo?.label ?? 'Período'} · {periodoInfo?.desde} a {periodoInfo?.hasta}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Empleado</th>
                {periodHeaders.map((day) => (
                  <th key={day.key} className="border-b border-slate-200 px-2 py-2 text-center text-[10px] uppercase text-slate-500">{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendanceMatrix.map((empleado: any) => (
                <tr key={empleado.empleadoId} className="even:bg-slate-50">
                  <td className="border-b border-slate-200 px-3 py-2 font-medium text-slate-800">{empleado.nombre}</td>
                  {periodHeaders.map((day) => (
                    <td key={day.key} className="border-b border-slate-200 px-2 py-2 align-top text-center">
                      {renderAttendanceDayCell(empleado.dailyByFecha.get(day.key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid 2xl:grid-cols-[1.65fr_0.95fr] gap-4">
        <div className="space-y-4">
          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-heading font-semibold text-lg text-gray-800">Control de fichadas y jornales</h3>
                <p className="text-[13px] text-slate-500">
                  Cada tarjeta muestra horario del día, escalas cargadas, tarifa aplicada al período y marcaciones manuales o por WhatsApp.
                </p>
              </div>
            </div>

            {empleados.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 p-8 text-center text-slate-500">
                No hay empleados de mantenimiento cargados todavía.
              </div>
            ) : (
              <div className="grid xl:grid-cols-2 gap-4">
                {empleados.map((empleado: any) => {
                  const attendance = empleado.attendance ?? {}
                  const liquidacion = empleado.liquidacion ?? {}
                  const turnos = empleado.turnos ?? []
                  const currentTurn = turnos.find((turn: any) => turn.turnoAbierto) ?? null
                  const displayTurn = currentTurn ?? turnos[turnos.length - 1] ?? null
                  const groupedTurns = groupTurnsByDay(turnos)
                  const onShift = !!attendance.onShift
                  const onLunch = !!attendance.onLunch
                  const statusLabel = onLunch ? 'En almuerzo' : onShift ? 'En servicio' : 'Fuera de turno'
                  const statusTone = onLunch
                    ? 'bg-amber-50 text-amber-700'
                    : onShift
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  const canEntry = !onShift
                  const canStartLunch = onShift && !onLunch
                  const canFinishLunch = onShift && onLunch
                  const canExit = onShift && !onLunch
                  const displayShiftGrossSeconds = onShift
                    ? attendance.currentShiftGrossSeconds ?? 0
                    : displayTurn?.grossSeconds ?? 0
                  const displayShiftLunchSeconds = onShift
                    ? attendance.currentShiftLunchSeconds ?? 0
                    : displayTurn?.lunchSeconds ?? 0
                  const displayShiftNetSeconds = onShift
                    ? attendance.currentShiftSeconds ?? 0
                    : displayTurn?.workedSeconds ?? 0
                  const liveClockSeconds = onLunch
                    ? attendance.currentLunchSeconds ?? 0
                    : onShift
                      ? attendance.currentShiftSeconds ?? 0
                      : displayShiftNetSeconds
                  const isSubmitting = registrar.isLoading && registrar.variables?.empleadoId === empleado.empleadoId
                  const turnHeaderLabel = onShift ? 'Turno actual' : displayTurn ? 'Último turno' : 'Turno actual'
                  const exitLabel = onShift
                    ? 'Turno abierto'
                    : formatTime(displayTurn?.salidaAt ?? null)

                  return (
                    <div key={empleado.empleadoId} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-[18px] bg-slate-100 text-slate-700 flex items-center justify-center">
                              <UserRound size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-heading text-[20px] font-semibold text-slate-800 truncate">{empleado.nombre}</div>
                              <div className="text-xs text-slate-500">{empleado.especialidad || 'Mantenimiento general'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>
                            <ShieldCheck size={12} />
                            {statusLabel}
                          </span>
                          {empleado.cierre && (
                            empleado.cierre.pagadoAt ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700">
                                <WalletCards size={12} />
                                Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                <BadgeCheck size={12} />
                                Cerrado
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[18px] text-white p-4" style={{ background: 'var(--sidebar-bg)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'oklch(1 0 0 / 0.35)' }}>{turnHeaderLabel}</div>
                            <div className="mt-1.5 font-mono text-[20px] leading-none font-semibold" style={{ color: 'var(--accent)', letterSpacing: '0.04em' }}>
                              <WorkingTime
                                seconds={liveClockSeconds}
                                isRunning={onShift}
                                variant="clock"
                                className="font-mono"
                              />
                            </div>
                          </div>
                          <div className="rounded-xl p-2" style={{ background: 'oklch(1 0 0 / 0.07)' }}>
                            <MonitorSmartphone size={15} style={{ color: 'var(--accent)' }} />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/65">
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Ingreso: {formatTime(displayTurn?.entradaAt ?? null)}</span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Inicio almuerzo: {formatTime(displayTurn?.inicioAlmuerzoAt ?? null)}</span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Fin almuerzo: {formatTime(displayTurn?.finAlmuerzoAt ?? null)}</span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">
                            Salida: {exitLabel}
                          </span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Última vía: {attendanceChannelLabel(attendance.lastChannel)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="rounded-[20px] bg-slate-50 p-3">
                          <div className="text-[11px] text-slate-500">Tarifa aplicada</div>
                          <div className="mt-1 font-heading text-xl font-semibold text-slate-800">{formatCurrency(liquidacion.tarifaMonto ?? 0)}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{appliedRateHint(liquidacion)}</div>
                        </div>
                        <div className="rounded-[20px] bg-slate-50 p-3">
                          <div className="text-[11px] text-slate-500">Total del período</div>
                          <div className="mt-1 font-heading text-xl font-semibold text-slate-800">{formatCurrency(liquidacion.totalPagar ?? 0)}</div>
                          {empleado.cierre?.pagadoAt && (
                            <div className="mt-1 text-[11px] text-cyan-700">Pagado el {formatDateTime(empleado.cierre.pagadoAt)}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Bruto del turno</div>
                          <div className="mt-1 font-medium text-slate-800">
                            <WorkingTime seconds={displayShiftGrossSeconds} />
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Almuerzo del turno</div>
                          <div className="mt-1 font-medium text-slate-800">
                            <WorkingTime seconds={displayShiftLunchSeconds} />
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Neto del turno</div>
                          <div className="mt-1 font-medium text-slate-800">
                            <WorkingTime seconds={displayShiftNetSeconds} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        {[
                          { label: 'Día', value: empleado.pagoDiario },
                          { label: 'Semana', value: empleado.pagoSemanal },
                          { label: 'Quincena', value: empleado.pagoQuincenal },
                          { label: 'Mes', value: empleado.pagoMensual },
                        ].map(item => (
                          <div key={item.label} className="rounded-[18px] border border-slate-200 px-3 py-2">
                            <div className="text-[11px] text-slate-500">{item.label}</div>
                            <div className="mt-1 font-medium text-slate-800">{formatCurrency(item.value ?? 0)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Días liquidados</div>
                          <div className="mt-1 font-heading text-xl font-semibold text-slate-800">{liquidacion.diasTrabajados ?? 0}</div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Horas período</div>
                          <div className="mt-1 font-medium text-slate-800">
                            <WorkingTime seconds={liquidacion.segundosTrabajados ?? 0} />
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Pendientes</div>
                          <div className="mt-1 font-heading text-xl font-semibold text-slate-800">{empleado.pendientesConfirmacion ?? 0}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Turnos del período</div>
                        {groupedTurns.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                            Sin turnos registrados en este período.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {groupedTurns.map((group) => (
                              <div key={group.fecha} className="rounded-[18px] border border-slate-200 px-3 py-3">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{group.etiqueta}</div>
                                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                  {group.turnos.map((turn: any) => <TurnChip key={turn.id} turn={turn} />)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mt-4">
                        <Button
                          variant={canEntry ? 'success' : 'outline'}
                          disabled={!canEntry || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'entrada' })}
                          className="w-full"
                        >
                          <LogIn size={14} />
                          Registrar entrada
                        </Button>
                        <Button
                          variant={canStartLunch ? 'outline' : 'outline'}
                          disabled={!canStartLunch || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'inicio_almuerzo' as AttendanceAction })}
                          className="w-full"
                        >
                          <Clock3 size={14} />
                          Iniciar almuerzo
                        </Button>
                        <Button
                          variant={canFinishLunch ? 'outline' : 'outline'}
                          disabled={!canFinishLunch || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'fin_almuerzo' as AttendanceAction })}
                          className="w-full"
                        >
                          <Clock3 size={14} />
                          Fin almuerzo
                        </Button>
                        <Button
                          variant={canExit ? 'destructive' : 'outline'}
                          disabled={!canExit || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'salida' })}
                          className="w-full"
                        >
                          <LogOut size={14} />
                          Registrar salida
                        </Button>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Último movimiento: {attendance.lastAction ? `${attendanceActionLabel(attendance.lastAction)} · ${formatDateTime(attendance.lastActionAt)}` : 'Sin movimientos aún'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-2xl bg-cyan-50 p-2.5 text-cyan-700">
                <Wallet size={16} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Liquidación rápida</h3>
                <p className="text-[13px] text-slate-500">Monto estimado a pagar según días trabajados del período seleccionado.</p>
              </div>
            </div>

            {rankingLiquidacion.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 p-6 text-center text-slate-500">
                Sin datos para liquidar.
              </div>
            ) : (
              <div className="space-y-3">
                {rankingLiquidacion.map((empleado: any, index: number) => (
                  <div key={empleado.empleadoId} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Puesto {index + 1}</div>
                        <div className="mt-1 font-heading text-base font-semibold text-slate-800 truncate">{empleado.nombre}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {empleado.liquidacion?.diasTrabajados ?? 0} días · <WorkingTime seconds={empleado.liquidacion?.segundosTrabajados ?? 0} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-lg font-semibold text-slate-800">{formatCurrency(empleado.liquidacion?.totalPagar ?? 0)}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatCurrency(empleado.liquidacion?.tarifaMonto ?? 0)} · {ratePeriodLabel(empleado.liquidacion?.tarifaPeriodo)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Actividad reciente</h3>
                <p className="text-[13px] text-slate-500">Marcaciones hechas desde el panel o desde el bot.</p>
              </div>
            </div>

            {eventos.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 p-6 text-center text-slate-500">
                Sin movimientos registrados todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {eventos.map((evento: any) => (
                  <div key={evento.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-800">{evento.empleadoNombre}</div>
                        <div className="text-xs text-slate-500">{evento.especialidad || 'Mantenimiento general'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${attendanceActionTone(evento.tipo)}`}>
                          {evento.tipo === 'entrada' ? <LogIn size={12} /> : evento.tipo === 'salida' ? <LogOut size={12} /> : <Clock3 size={12} />}
                          {attendanceActionLabel(evento.tipo)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                          <MonitorSmartphone size={11} />
                          {attendanceChannelLabel(evento.canal)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={12} />
                      {formatDateTime(getAttendanceEventDateTime(evento)?.toString() ?? null)}
                    </div>
                    {evento.nota && <div className="mt-2 text-sm text-slate-600">{evento.nota}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TimerReset size={16} className="text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-base text-gray-800">Control cruzado</h3>
                <p className="text-[13px] text-slate-500">La asistencia y los reclamos se leen desde el mismo tablero.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">En curso</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">
                  {empleados.reduce((acc: number, empleado: any) => acc + (empleado.tareasEnCurso ?? 0), 0)}
                </div>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Por confirmar</div>
                <div className="mt-2 font-heading text-2xl font-semibold text-slate-800">
                  {equipo?.pendientesConfirmacion ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
