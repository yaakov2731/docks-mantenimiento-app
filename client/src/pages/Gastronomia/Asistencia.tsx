import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import WorkingTime from '../../components/WorkingTime'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import { CalendarDays, Clock3, Coffee, LogIn, LogOut, PencilLine, Store, Timer, UserRoundCheck, Users, Wallet } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
type AttendanceAction = 'entrada' | 'inicio_almuerzo' | 'fin_almuerzo' | 'salida'
type AttendanceStatus = {
  onShift?: boolean
  onLunch?: boolean
  lastAction?: AttendanceAction | string | null
  lastActionAt?: string | Date | null
  lastEntryAt?: string | Date | null
  workedSecondsToday?: number
  currentShiftSeconds?: number
  currentLunchSeconds?: number
  lastShiftWorkedSeconds?: number
  assignedLocalLabel?: string | null
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin registro'
  return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtMinutes(mins: number): string {
  if (mins === 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateInputValue(value: Date | string | number = new Date()) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toTimeInputValue(value: Date | string | number = new Date()) {
  const date = new Date(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toInputDateTime(date: string, time: string) {
  return new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
}

function actionLabel(tipo: string) {
  if (tipo === 'entrada') return 'Entrada'
  if (tipo === 'salida') return 'Salida'
  if (tipo === 'inicio_almuerzo') return 'Inicio almuerzo'
  if (tipo === 'fin_almuerzo') return 'Fin almuerzo'
  return tipo
}

function getStatusMeta(status?: AttendanceStatus | null) {
  if (status?.onLunch) {
    return {
      label: 'Almuerzo',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      clockLabel: 'Tiempo de almuerzo',
      runningSeconds: Number(status.currentLunchSeconds ?? 0),
      isRunning: true,
    }
  }
  if (status?.onShift) {
    return {
      label: 'En turno',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      clockLabel: 'Turno activo',
      runningSeconds: Number(status.currentShiftSeconds ?? status.workedSecondsToday ?? 0),
      isRunning: true,
    }
  }
  return {
    label: 'Fuera de turno',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
    clockLabel: 'Ultimo turno',
    runningSeconds: Number(status?.lastShiftWorkedSeconds ?? 0),
    isRunning: false,
  }
}

function getEventsForDay(events: any[], empId: number, dateKey: string) {
  return events
    .filter((e: any) => e.empleadoId === empId && getDateKey(new Date(e.timestamp)) === dateKey)
    .sort((left: any, right: any) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

function calcDayMinutes(events: any[], empId: number, dateKey: string): number {
  const evts = getEventsForDay(events, empId, dateKey)
  const entrada = evts.find((e: any) => e.tipo === 'entrada')
  const salida = [...evts].reverse().find((e: any) => e.tipo === 'salida')
  if (!entrada || !salida) return 0
  let ms = new Date(salida.timestamp).getTime() - new Date(entrada.timestamp).getTime()
  const inicioAlmuerzo = evts.find((e: any) => e.tipo === 'inicio_almuerzo')
  const finAlmuerzo = evts.find((e: any) => e.tipo === 'fin_almuerzo')
  if (inicioAlmuerzo && finAlmuerzo) {
    ms -= new Date(finAlmuerzo.timestamp).getTime() - new Date(inicioAlmuerzo.timestamp).getTime()
  }
  return Math.max(0, Math.round(ms / 60000))
}

function MetricCard({ label, value, hint, icon: Icon, tone }: {
  label: string
  value: string | number
  hint: string
  icon: ComponentType<{ size?: number; className?: string }>
  tone: string
}) {
  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-65">{label}</div>
          <div className="mt-2 font-heading text-3xl font-semibold leading-none">{value}</div>
        </div>
        <div className="rounded-2xl bg-white/70 p-2.5">
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-3 text-xs opacity-70">{hint}</div>
    </div>
  )
}

export default function GastronomiaAsistencia() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sector, setSector] = useState<string>('todos')
  const [selectedCell, setSelectedCell] = useState<{ empId: number; day: number } | null>(null)
  const [manualOpenFor, setManualOpenFor] = useState<number | null>(null)
  const [manualForm, setManualForm] = useState(() => ({
    tipo: 'entrada' as AttendanceAction,
    fecha: toDateInputValue(),
    hora: toTimeInputValue(),
    nota: '',
  }))
  const [now, setNow] = useState(() => new Date())
  const utils = trpc.useUtils()

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const { data } = trpc.gastronomia.getMarcaciones.useQuery(
    { sector: sector === 'todos' ? undefined : sector, year, month },
    { refetchInterval: 5000, refetchOnWindowFocus: true }
  )
  const { data: liquidacion = [] } = trpc.gastronomia.getLiquidacion.useQuery({
    sector: sector === 'todos' ? undefined : sector,
    year,
    month,
  })
  const crearManual = trpc.asistencia.crearManual.useMutation({
    onSuccess: async () => {
      setManualForm(current => ({ ...current, nota: '' }))
      await Promise.all([
        utils.gastronomia.getMarcaciones.invalidate(),
        utils.gastronomia.getLiquidacion.invalidate(),
      ])
    },
    onError: error => {
      window.alert(error.message)
    },
  })

  const employees = ((data as any)?.employees ?? []).filter((emp: any) => emp.activo !== false)
  const events = (data as any)?.events ?? []
  const statusesByEmployee = ((data as any)?.statusesByEmployee ?? {}) as Record<string, AttendanceStatus>
  const daysInMonth = getDaysInMonth(year, month)
  const todayKey = getDateKey(now)
  const sectorLabel = (val: string) => SECTORES_GASTRONOMIA.find(s => s.value === val)?.label ?? val

  const stats = useMemo(() => {
    const onShift = employees.filter((emp: any) => statusesByEmployee[String(emp.id)]?.onShift).length
    const onLunch = employees.filter((emp: any) => statusesByEmployee[String(emp.id)]?.onLunch).length
    const todayMinutes = employees.reduce((sum: number, emp: any) => sum + calcDayMinutes(events, emp.id, todayKey), 0)
    const total = (liquidacion as any[]).reduce((sum, row) => sum + Number(row.total ?? 0), 0)
    return { onShift, onLunch, todayMinutes, total }
  }, [employees, events, todayKey, liquidacion, statusesByEmployee])

  const recentEvents = [...events]
    .sort((left: any, right: any) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 8)

  function hasEntrada(empId: number, day: number): boolean {
    const key = getDateKey(new Date(year, month - 1, day))
    return events.some((e: any) => e.empleadoId === empId && e.tipo === 'entrada' && getDateKey(new Date(e.timestamp)) === key)
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const selectedEvents = selectedCell ? getEventsForDay(events, selectedCell.empId, getDateKey(new Date(year, month - 1, selectedCell.day))) : []
  const selectedEmp = selectedCell ? employees.find((e: any) => e.id === selectedCell.empId) : null

  return (
    <DashboardLayout title="Asistencia Gastronomía">
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="asistencia" />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <Store size={14} />
                  {sector === 'todos' ? 'Reloj de Gastronomía' : sectorLabel(sector)}
                </div>
                <h1 className="mt-3 font-heading text-[28px] md:text-[36px] font-semibold leading-tight text-slate-950">
                  Asistencia de Gastronomía con el mismo criterio operativo del shopping
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Reloj central, estado actual, actividad reciente y grilla mensual para el equipo gastronómico.
                </p>
              </div>
              <div className="rounded-[26px] bg-slate-950 px-5 py-4 text-right text-white">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">Reloj de asistencia</div>
                <div className="mt-2 font-mono text-[42px] font-bold leading-none text-emerald-300">
                  {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </div>
                <div className="mt-2 text-xs text-white/45">
                  {now.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={prevMonth} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300">Anterior</button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
                {MESES[month - 1]} {year}
              </div>
              <button onClick={nextMonth} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300">Siguiente</button>
              <select value={sector} onChange={e => setSector(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                <option value="todos">Todos los locales</option>
                {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Personal" value={employees.length} hint="Activos en este filtro." icon={Users} tone="border-slate-200 bg-white text-slate-900" />
            <MetricCard label="En turno" value={stats.onShift} hint="Jornada activa." icon={UserRoundCheck} tone="border-emerald-200 bg-emerald-50 text-emerald-900" />
            <MetricCard label="Almuerzo" value={stats.onLunch} hint="Pausas abiertas." icon={Coffee} tone="border-amber-200 bg-amber-50 text-amber-900" />
            <MetricCard label="Pago estimado" value={formatCurrency(stats.total)} hint="Mes seleccionado." icon={Wallet} tone="border-sky-200 bg-sky-50 text-sky-900" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-slate-900">Estado actual del equipo</h2>
                <p className="text-sm text-slate-500">Reloj por empleado con última marca y acumulado.</p>
              </div>
              <Timer size={18} className="text-emerald-700" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {employees.map((emp: any) => {
                const status = statusesByEmployee[String(emp.id)] ?? null
                const statusMeta = getStatusMeta(status)
                const minutesToday = calcDayMinutes(events, emp.id, todayKey)
                const monthMinutes = Array.from({ length: daysInMonth }, (_, i) => i + 1)
                  .reduce((sum, day) => sum + calcDayMinutes(events, emp.id, getDateKey(new Date(year, month - 1, day))), 0)
                const payroll = (liquidacion as any[]).find((row: any) => row.empleado?.id === emp.id)
                const isManualOpen = manualOpenFor === emp.id

                return (
                  <div key={emp.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-heading text-lg font-semibold text-slate-900 truncate">{emp.nombre}</div>
                        <div className="mt-1 text-xs text-slate-500">{sectorLabel(emp.sector)} · {emp.puesto || 'Sin puesto'}</div>
                        {emp.puedeGastronomia ? (
                          <div className="mt-2 inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                            Empleado doble
                          </div>
                        ) : null}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[18px] bg-slate-950 p-4 text-white">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">{statusMeta.clockLabel}</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="font-semibold text-emerald-300">{actionLabel(String(status?.lastAction ?? 'Sin marca'))}</div>
                        <WorkingTime
                          seconds={statusMeta.runningSeconds}
                          isRunning={statusMeta.isRunning}
                          variant="clock"
                          className="font-mono text-lg font-semibold"
                        />
                      </div>
                      <div className="mt-2 text-xs text-white/45">{formatDateTime(status?.lastActionAt ?? status?.lastEntryAt ?? null)}</div>
                      <div className="mt-1 text-xs text-white/45">
                        {status?.assignedLocalLabel ? `Local activo: ${status.assignedLocalLabel}` : `Base: ${sectorLabel(emp.sector)}`}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-[11px] text-slate-500">Hoy</div>
                        <div className="mt-1 font-semibold text-slate-900">{fmtMinutes(minutesToday) || '0h'}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-[11px] text-slate-500">Mes</div>
                        <div className="mt-1 font-semibold text-slate-900">{fmtMinutes(monthMinutes) || '0h'}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-[11px] text-slate-500">Pago</div>
                        <div className="mt-1 font-semibold text-slate-900">{formatCurrency(payroll?.total ?? 0)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          if (isManualOpen) {
                            setManualOpenFor(null)
                            return
                          }
                          setManualOpenFor(emp.id)
                          setManualForm({
                            tipo: 'entrada',
                            fecha: toDateInputValue(),
                            hora: toTimeInputValue(),
                            nota: '',
                          })
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300"
                      >
                        <PencilLine size={14} />
                        {isManualOpen ? 'Cerrar manual' : 'Cargar manual'}
                      </button>
                    </div>

                    {isManualOpen ? (
                      <div className="mt-3 rounded-[18px] border border-slate-200 bg-white p-3">
                        <div className="mb-3 text-sm font-semibold text-slate-900">Registrar marcacion manual</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-500">Tipo</span>
                            <select
                              value={manualForm.tipo}
                              onChange={e => setManualForm(current => ({ ...current, tipo: e.target.value as AttendanceAction }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <option value="entrada">Entrada</option>
                              <option value="inicio_almuerzo">Inicio almuerzo</option>
                              <option value="fin_almuerzo">Fin almuerzo</option>
                              <option value="salida">Salida</option>
                            </select>
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-500">Fecha</span>
                            <input
                              type="date"
                              value={manualForm.fecha}
                              max={toDateInputValue()}
                              onChange={e => setManualForm(current => ({ ...current, fecha: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            />
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-500">Hora</span>
                            <input
                              type="time"
                              value={manualForm.hora}
                              onChange={e => setManualForm(current => ({ ...current, hora: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            />
                          </label>
                          <label className="text-sm sm:col-span-2">
                            <span className="mb-1 block text-xs font-medium text-slate-500">Nota</span>
                            <input
                              value={manualForm.nota}
                              onChange={e => setManualForm(current => ({ ...current, nota: e.target.value }))}
                              placeholder="Ej: supervisor carga entrada manual"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => crearManual.mutate({
                              empleadoId: emp.id,
                              tipo: manualForm.tipo,
                              fechaHora: toInputDateTime(manualForm.fecha, manualForm.hora),
                              nota: manualForm.nota || undefined,
                            })}
                            disabled={crearManual.isLoading}
                            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {crearManual.isLoading ? 'Guardando...' : 'Guardar marcacion'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {employees.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 md:col-span-2">
                  Sin empleados para este selector.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={17} className="text-emerald-700" />
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-900">Actividad reciente</h2>
                <p className="text-sm text-slate-500">Marcaciones del bot y panel.</p>
              </div>
            </div>
            <div className="space-y-3">
              {recentEvents.map((event: any) => {
                const emp = employees.find((item: any) => item.id === event.empleadoId)
                return (
                  <div key={event.id} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{emp?.nombre ?? event.empleadoNombre ?? 'Empleado'}</div>
                        <div className="text-xs text-slate-500">{emp ? sectorLabel(emp.sector) : 'Gastronomía'}</div>
                        {emp?.puedeGastronomia ? (
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">Empleado doble</div>
                        ) : null}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {event.tipo === 'salida' ? <LogOut size={12} /> : <LogIn size={12} />}
                        {actionLabel(event.tipo)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={12} />
                      {formatDateTime(event.timestamp)}
                    </div>
                  </div>
                )
              })}
              {recentEvents.length === 0 && (
                <div className="rounded-[18px] border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Sin movimientos registrados todavía.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="font-heading text-xl font-semibold text-slate-900">Grilla mensual</h2>
            <p className="text-sm text-slate-500">Control de días trabajados por empleado y local.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[190px] border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">Empleado</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="min-w-[36px] border border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-500">
                      {day}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 min-w-[66px] border border-slate-200 bg-emerald-50 px-2 py-2 text-center font-semibold text-emerald-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800">
                      <div>{emp.nombre}</div>
                      <div className="text-[11px] font-normal text-slate-400">{sectorLabel(emp.sector)}</div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const key = getDateKey(new Date(year, month - 1, day))
                      const present = hasEntrada(emp.id, day)
                      const mins = calcDayMinutes(events, emp.id, key)
                      const isSelected = selectedCell?.empId === emp.id && selectedCell?.day === day
                      return (
                        <td
                          key={day}
                          onClick={() => setSelectedCell(present ? { empId: emp.id, day } : null)}
                          className={`cursor-pointer border border-slate-200 text-center transition-colors ${
                            isSelected ? 'bg-emerald-100' :
                            present ? 'bg-emerald-50 hover:bg-emerald-100' :
                            'hover:bg-slate-50'
                          }`}
                        >
                          {present ? (
                            mins > 0
                              ? <span className="text-[11px] font-semibold text-emerald-700">{fmtMinutes(mins)}</span>
                              : <span className="font-bold text-emerald-600">✓</span>
                          ) : (
                            <span className="text-slate-200">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="sticky right-0 z-10 border border-slate-200 bg-white px-2 py-2 text-center font-semibold text-slate-800">
                      {fmtMinutes(Array.from({ length: daysInMonth }, (_, i) => i + 1)
                        .reduce((sum, day) => sum + calcDayMinutes(events, emp.id, getDateKey(new Date(year, month - 1, day))), 0)) || '0h'}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={daysInMonth + 2} className="px-4 py-8 text-center text-slate-400">Sin empleados para este selector</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedCell && selectedEmp && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-heading text-lg font-semibold text-slate-900">
              {selectedEmp.nombre} - {selectedCell.day}/{month}/{year}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Sin registros</p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {selectedEvents.map((e: any) => (
                  <div key={e.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{actionLabel(e.tipo)}</div>
                    <div className="mt-1 font-mono text-lg">{formatTime(e.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedCell(null)} className="mt-4 text-sm font-semibold text-slate-400 hover:text-slate-700">Cerrar detalle</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
