import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '../components/ui/confirm-dialog'
import DashboardLayout from '../components/DashboardLayout'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { attendanceChannelLabel, getAttendanceEventDateTime } from '../lib/attendancePresentation'
import { exportarAsistenciaExcel } from '../lib/exportAttendanceExcel'
import {
  Activity,
  BadgeCheck,
  CalendarRange,
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

function DayChip({ day }: { day: any }) {
  const active = day.entradas > 0 || day.salidas > 0 || day.workedSeconds > 0 || day.turnoAbierto
  return (
    <div
      className={`min-w-[78px] rounded-2xl border px-3 py-2 ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide opacity-70">{day.etiqueta}</div>
      <div className="mt-1 text-xs font-medium">
        {active ? <WorkingTime seconds={day.workedSeconds ?? 0} /> : 'Sin turno'}
      </div>
      <div className="mt-1 text-[10px] opacity-70">
        {day.entradas ?? 0} e · {day.salidas ?? 0} s
      </div>
    </div>
  )
}

export default function Asistencia() {
  const confirm = useConfirm()
  const [periodo, setPeriodo] = useState<Periodo>('dia')
  const [empleadoId, setEmpleadoId] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const { data: catalogoEmpleados = [] } = trpc.empleados.listar.useQuery()
  const selectedEmpleadoId = empleadoId ? Number(empleadoId) : undefined

  const resumen = trpc.asistencia.resumen.useQuery({ periodo, empleadoId: selectedEmpleadoId }, { refetchInterval: 15000 })
  const registrar = trpc.asistencia.registrar.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
  const cerrarLiquidacion = trpc.asistencia.cerrarLiquidacion.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
      toast.success('Liquidación cerrada y congelada correctamente.')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
  const marcarPagado = trpc.asistencia.marcarPagado.useMutation({
    onSuccess: async () => {
      await resumen.refetch()
      toast.success('Liquidación marcada como pagada.')
    },
    onError: (error) => {
      toast.error(error.message)
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
                  onClick={() => setPeriodo(option.value)}
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
                onClick={() => {
                  if (!resumen.data) return
                  exportarAsistenciaExcel({
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
                onClick={async () => {
                  const scope = selectedEmpleadoId ? 'este empleado' : 'todo el equipo'
                  const ok = await confirm({
                    title: 'Cerrar liquidación',
                    message: `¿Cerrar la liquidación de ${scope} para ${periodoInfo?.label?.toLowerCase() ?? 'este período'}?`,
                    confirmLabel: 'Cerrar liquidación',
                    variant: 'warning',
                  })
                  if (!ok) return
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
                onClick={async () => {
                  const scope = selectedEmpleadoId ? 'este empleado' : 'todo el equipo'
                  const ok = await confirm({
                    title: 'Marcar como pagada',
                    message: `¿Marcar como pagada la liquidación de ${scope}?`,
                    confirmLabel: 'Marcar pagada',
                    variant: 'warning',
                  })
                  if (!ok) return
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

          <div className="rounded-[28px] bg-[#17212B] text-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Reloj central</div>
                <div className="mt-1 text-sm text-white/65">Puesto de control administrativo</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <Clock3 size={18} className="text-cyan-300" />
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/15 px-4 py-5">
              <div className="font-mono text-[42px] leading-none tracking-[0.08em] text-cyan-300 md:text-[52px]">{digitalTime}</div>
              <div className="mt-3 text-sm capitalize text-white/70">{formatFullDate(now)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-[22px] bg-white/6 px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-white/35">En turno</div>
                <div className="mt-2 font-heading text-3xl font-semibold">{equipo?.enTurno ?? 0}</div>
              </div>
              <div className="rounded-[22px] bg-white/6 px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-white/35">A pagar</div>
                <div className="mt-2 font-heading text-2xl font-semibold">{formatCurrency(equipo?.totalPagar ?? 0)}</div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => resumen.refetch()}
              disabled={resumen.isFetching}
              className="mt-4 w-full border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              <RefreshCw size={14} className={resumen.isFetching ? 'animate-spin' : ''} />
              Actualizar tablero
            </Button>
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
                  const hoy = empleado.hoy ?? {}
                  const onShift = !!attendance.onShift
                  const isSubmitting = registrar.isLoading && registrar.variables?.empleadoId === empleado.empleadoId

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
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${onShift ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            <ShieldCheck size={12} />
                            {onShift ? 'En servicio' : 'Fuera de turno'}
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

                      <div className="mt-4 rounded-[22px] bg-[#182330] text-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Control diario</div>
                            <div className="mt-2 font-mono text-[32px] leading-none text-cyan-300">
                              {onShift ? (
                                <WorkingTime seconds={attendance.currentShiftSeconds ?? 0} isRunning className="font-mono" />
                              ) : (
                                formatTime(hoy?.primerIngresoAt)
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-3">
                            <MonitorSmartphone size={18} className="text-cyan-200" />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/65">
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Ingreso: {formatTime(hoy?.primerIngresoAt)}</span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">
                            Salida: {onShift ? 'Turno abierto' : formatTime(hoy?.ultimaSalidaAt)}
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
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Historial del período</div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {(liquidacion.dias ?? []).map((day: any) => <DayChip key={day.fecha} day={day} />)}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant={onShift ? 'outline' : 'success'}
                          disabled={onShift || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'entrada' })}
                          className="flex-1"
                        >
                          <LogIn size={14} />
                          Registrar entrada
                        </Button>
                        <Button
                          variant={onShift ? 'destructive' : 'outline'}
                          disabled={!onShift || isSubmitting}
                          onClick={() => registrar.mutate({ empleadoId: empleado.empleadoId, accion: 'salida' })}
                          className="flex-1"
                        >
                          <LogOut size={14} />
                          Registrar salida
                        </Button>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Último movimiento: {attendance.lastAction ? `${attendance.lastAction} · ${formatDateTime(attendance.lastActionAt)}` : 'Sin movimientos aún'}
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${evento.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {evento.tipo === 'entrada' ? <LogIn size={12} /> : <LogOut size={12} />}
                          {evento.tipo}
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
