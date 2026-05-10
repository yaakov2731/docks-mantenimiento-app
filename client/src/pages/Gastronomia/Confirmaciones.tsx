import { useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Send,
  UserRoundCheck,
  Users,
  XCircle,
} from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

type StatusFilter = 'todos' | 'confirmado' | 'enviado' | 'no_trabaja' | 'borrador'

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getMonday(input: Date) {
  const date = new Date(input)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDay(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function statusLabel(status?: string) {
  if (status === 'confirmado') return 'Confirmó'
  if (status === 'no_trabaja') return 'No trabaja'
  if (status === 'enviado') return 'Sin respuesta'
  if (status === 'sin_respuesta') return 'Sin respuesta'
  if (status === 'cancelado') return 'Cancelado'
  return 'Sin enviar'
}

function statusStyle(status?: string) {
  if (status === 'confirmado') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'no_trabaja') return 'border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'enviado' || status === 'sin_respuesta') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'cancelado') return 'border-slate-200 bg-slate-100 text-slate-500'
  return 'border-sky-200 bg-sky-50 text-sky-800'
}

function sectorLabel(value: string) {
  return SECTORES_GASTRONOMIA.find(item => item.value === value)?.label ?? value
}

export default function GastronomiaConfirmaciones() {
  const [weekStartMs, setWeekStartMs] = useState(() => getMonday(new Date()).getTime())
  const [sector, setSector] = useState('todos')
  const [status, setStatus] = useState<StatusFilter>('todos')
  const [search, setSearch] = useState('')
  const utils = trpc.useUtils()

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => dateKey(new Date(weekStartMs + index * DAY_MS))), [weekStartMs])
  const desde = weekDays[0]
  const hasta = dateKey(new Date(weekStartMs + 7 * DAY_MS))

  const { data: turnos = [], isLoading } = trpc.gastronomia.listPlanificacion.useQuery({
    desde,
    hasta,
    sector: sector === 'todos' ? undefined : sector,
  })
  const { data: empleados = [] } = trpc.gastronomia.listEmpleados.useQuery({
    sector: sector === 'todos' ? undefined : sector,
    activo: true,
  })
  const resetMut = trpc.gastronomia.resetPlanificacionConfirmaciones.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.gastronomia.listPlanificacion.invalidate(),
        utils.gastronomia.listEmpleados.invalidate(),
      ])
      alert(`Semana reiniciada. Turnos reseteados: ${result.reset}.`)
    },
    onError: error => alert(error.message),
  })
  const clearWeekMut = trpc.gastronomia.clearPlanificacionSemana.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.gastronomia.listPlanificacion.invalidate(),
        utils.gastronomia.listEmpleados.invalidate(),
      ])
      alert(result.scope === 'rechazados'
        ? `Turnos no aceptados borrados: ${result.cleared}.`
        : `Semana borrada. Turnos eliminados: ${result.cleared}.`)
    },
    onError: error => alert(error.message),
  })

  const rows = turnos as any[]
  const activeEmployees = empleados as any[]
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(row => {
      const matchStatus = status === 'todos'
        || (status === 'enviado' ? row.estado === 'enviado' || row.estado === 'sin_respuesta' : row.estado === status)
      const matchSearch = !q
        || row.empleadoNombre?.toLowerCase().includes(q)
        || row.puesto?.toLowerCase().includes(q)
        || sectorLabel(row.sector).toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [rows, status, search])

  const employeeIds = new Set(rows.map(row => row.empleadoId))
  const confirmedIds = new Set(rows.filter(row => row.estado === 'confirmado').map(row => row.empleadoId))
  const noWorkIds = new Set(rows.filter(row => row.estado === 'no_trabaja').map(row => row.empleadoId))
  const pendingRows = rows.filter(row => row.estado === 'enviado' || row.estado === 'sin_respuesta')
  const unsentRows = rows.filter(row => row.estado === 'borrador')
  const rejectedRows = rows.filter(row => row.estado === 'no_trabaja')
  const confirmRate = rows.length > 0 ? Math.round((rows.filter(row => row.estado === 'confirmado').length / rows.length) * 100) : 0
  const canReset = sector !== 'todos' && rows.length > 0
  const canClearRejected = sector !== 'todos' && rejectedRows.length > 0

  const bySector = useMemo(() => {
    const map = new Map<string, { sector: string; total: number; confirmed: number; pending: number; rejected: number }>()
    for (const row of rows) {
      const current = map.get(row.sector) ?? { sector: row.sector, total: 0, confirmed: 0, pending: 0, rejected: 0 }
      current.total++
      if (row.estado === 'confirmado') current.confirmed++
      if (row.estado === 'no_trabaja') current.rejected++
      if (row.estado === 'enviado' || row.estado === 'sin_respuesta') current.pending++
      map.set(row.sector, current)
    }
    return Array.from(map.values()).sort((a, b) => sectorLabel(a.sector).localeCompare(sectorLabel(b.sector)))
  }, [rows])

  const byDay = useMemo(() => {
    return weekDays.map(day => {
      const dayRows = rows.filter(row => row.fecha === day)
      return {
        day,
        total: dayRows.length,
        confirmed: dayRows.filter(row => row.estado === 'confirmado').length,
        pending: dayRows.filter(row => row.estado === 'enviado' || row.estado === 'sin_respuesta').length,
        rejected: dayRows.filter(row => row.estado === 'no_trabaja').length,
      }
    })
  }, [rows, weekDays])

  async function handleResetWeek() {
    if (sector === 'todos') {
      alert('Elegí un local puntual para reiniciar la semana.')
      return
    }
    if (!window.confirm(`Vas a reiniciar confirmaciones de ${sectorLabel(sector)} para la semana ${desde} al ${weekDays[6]}. Se limpiarán respuestas y volverán a borrador. ¿Continuar?`)) {
      return
    }
    await resetMut.mutateAsync({
      sector,
      desde,
      hasta,
    })
  }

  async function handleClearRejected() {
    if (sector === 'todos') {
      alert('Elegí un local puntual para borrar solo los no aceptados.')
      return
    }
    if (!window.confirm(`Vas a borrar ${rejectedRows.length} turno(s) no aceptados de ${sectorLabel(sector)} para la semana ${desde} al ${weekDays[6]}. Esta acción limpia la pantalla y elimina esos turnos. ¿Continuar?`)) {
      return
    }
    await clearWeekMut.mutateAsync({
      sector,
      desde,
      hasta,
      scope: 'rechazados',
    })
  }

  async function handleClearWeek() {
    if (sector === 'todos') {
      alert('Elegí un local puntual para borrar la semana completa.')
      return
    }
    if (!window.confirm(`Vas a borrar toda la planificación de ${sectorLabel(sector)} para la semana ${desde} al ${weekDays[6]}. La pantalla quedará limpia para volver a cargar desde cero. ¿Continuar?`)) {
      return
    }
    await clearWeekMut.mutateAsync({
      sector,
      desde,
      hasta,
      scope: 'semana_completa',
    })
  }

  return (
    <DashboardLayout title="Confirmaciones Gastronomía">
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="confirmaciones" />

        <section className="gastro-hero rounded-[34px] p-5 text-white shadow-sm md:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="gastro-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                <UserRoundCheck size={14} />
                Control de confirmaciones
              </div>
              <h1 className="mt-3 font-heading text-[28px] font-semibold leading-tight text-white md:text-[40px]">
                Tablero ejecutivo para ver respuestas, faltantes y rechazos en una sola pasada.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                La semana queda ordenada por local y por día para detectar rápido quién confirmó, quién no respondió y dónde hace falta rearmar cobertura.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setWeekStartMs(ms => ms - 7 * DAY_MS)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/16 active:scale-[0.98]"
                  title="Semana anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">Semana</div>
                  <div className="text-sm font-semibold text-white">{desde} al {weekDays[6]}</div>
                </div>
                <button
                  onClick={() => setWeekStartMs(ms => ms + 7 * DAY_MS)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/16 active:scale-[0.98]"
                  title="Semana siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={() => setWeekStartMs(getMonday(new Date()).getTime())}
                className="gastro-button-primary mt-3 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.99]"
              >
                Esta semana
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="gastro-kpi rounded-[28px] p-4">
            <div className="flex items-center justify-between text-slate-400"><span className="text-[11px] uppercase tracking-wide">Empleados</span><Users size={18} /></div>
            <div className="mt-2 font-heading text-3xl font-semibold text-slate-950">{activeEmployees.length}</div>
            <div className="text-xs text-slate-400">{employeeIds.size} con turnos planificados</div>
          </div>
          <div className="gastro-kpi gastro-kpi-accent rounded-[28px] p-4">
            <div className="flex items-center justify-between text-emerald-700"><span className="text-[11px] uppercase tracking-wide">Confirmaron</span><CheckCircle2 size={18} /></div>
            <div className="mt-2 font-heading text-3xl font-semibold text-emerald-950">{confirmedIds.size}</div>
            <div className="text-xs text-emerald-700">{confirmRate}% de turnos confirmados</div>
          </div>
          <div className="gastro-kpi rounded-[28px] p-4">
            <div className="flex items-center justify-between text-amber-700"><span className="text-[11px] uppercase tracking-wide">Sin respuesta</span><Clock3 size={18} /></div>
            <div className="mt-2 font-heading text-3xl font-semibold text-amber-950">{pendingRows.length}</div>
            <div className="text-xs text-amber-700">mensajes enviados pendientes</div>
          </div>
          <div className="gastro-kpi rounded-[28px] p-4">
            <div className="flex items-center justify-between text-rose-700"><span className="text-[11px] uppercase tracking-wide">No trabajan</span><XCircle size={18} /></div>
            <div className="mt-2 font-heading text-3xl font-semibold text-rose-950">{noWorkIds.size}</div>
            <div className="text-xs text-rose-700">empleados rechazaron</div>
          </div>
          <div className="gastro-kpi rounded-[28px] p-4">
            <div className="flex items-center justify-between text-sky-700"><span className="text-[11px] uppercase tracking-wide">Sin enviar</span><Send size={18} /></div>
            <div className="mt-2 font-heading text-3xl font-semibold text-sky-950">{unsentRows.length}</div>
            <div className="text-xs text-sky-700">turnos en borrador</div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="gastro-panel rounded-[28px] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filtros</div>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Local</span>
                <select value={sector} onChange={event => setSector(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="todos">Todos los locales</option>
                  {SECTORES_GASTRONOMIA.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="mt-3 block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Estado</span>
                <select value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="todos">Todos</option>
                  <option value="confirmado">Confirmaron</option>
                  <option value="enviado">Sin respuesta</option>
                  <option value="no_trabaja">No trabajan</option>
                  <option value="borrador">Sin enviar</option>
                </select>
              </label>
              <label className="mt-3 block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Buscar</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <Search size={15} className="text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Empleado, rol o local" className="w-full bg-transparent text-sm outline-none" />
                </div>
              </label>
            </div>

            <div className="gastro-panel rounded-[28px] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={18} className="text-slate-500" />
                <div className="font-heading text-lg font-semibold text-slate-950">Por día</div>
              </div>
              <div className="space-y-2">
                {byDay.map(day => (
                  <div key={day.day} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold capitalize text-slate-800">{formatDay(day.day)}</div>
                      <div className="text-xs font-semibold text-slate-500">{day.total} turnos</div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] font-semibold">
                      <span className="rounded-xl bg-emerald-100 px-2 py-1 text-emerald-800">{day.confirmed} OK</span>
                      <span className="rounded-xl bg-amber-100 px-2 py-1 text-amber-800">{day.pending} pend.</span>
                      <span className="rounded-xl bg-rose-100 px-2 py-1 text-rose-800">{day.rejected} no</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            {sector === 'todos' && bySector.length > 0 && (
              <section className="gastro-panel rounded-[28px] p-4">
                <div className="mb-3 font-heading text-lg font-semibold text-slate-950">Resumen por local</div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {bySector.map(item => (
                    <button key={item.sector} onClick={() => setSector(item.sector)} className="gastro-button-soft rounded-2xl p-3 text-left active:scale-[0.99]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">{sectorLabel(item.sector)}</div>
                        <div className="text-xs font-semibold text-slate-500">{item.total}</div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.total ? (item.confirmed / item.total) * 100 : 0}%` }} />
                      </div>
                      <div className="mt-2 flex gap-1 text-[11px] font-semibold">
                        <span className="text-emerald-700">{item.confirmed} OK</span>
                        <span className="text-amber-700">{item.pending} pend.</span>
                        <span className="text-rose-700">{item.rejected} no</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="gastro-panel rounded-[28px] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Detalle</div>
                  <h2 className="font-heading text-xl font-semibold text-slate-950">{filteredRows.length} turnos encontrados</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pendingRows.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      <AlertCircle size={15} />
                      Revisar pendientes antes del turno
                    </div>
                  )}
                  <button
                    onClick={() => void handleClearRejected()}
                    disabled={!canClearRejected || clearWeekMut.isLoading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle size={15} />
                    Borrar no aceptados
                  </button>
                  <button
                    onClick={() => void handleClearWeek()}
                    disabled={!canReset || clearWeekMut.isLoading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle size={15} />
                    Borrar semana
                  </button>
                  <button
                    onClick={() => void handleResetWeek()}
                    disabled={!canReset || resetMut.isLoading || clearWeekMut.isLoading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle size={15} />
                    Reiniciar respuestas
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <UserRoundCheck size={22} />
                  </div>
                  <div className="mt-3 font-semibold text-slate-800">No hay confirmaciones para esos filtros.</div>
                  <div className="mt-1 text-sm text-slate-400">Cambiá el local, la semana o el estado para ver resultados.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="gastro-table min-w-[920px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-3 font-semibold">Empleado</th>
                        <th className="px-4 py-3 font-semibold">Local</th>
                        <th className="px-4 py-3 font-semibold">Día</th>
                        <th className="px-4 py-3 font-semibold">Horario</th>
                        <th className="px-4 py-3 font-semibold">Rol</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{row.empleadoNombre}</div>
                            <div className="text-xs text-slate-400">Empleado #{row.empleadoId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{sectorLabel(row.sector)}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{formatDay(row.fecha)}</td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{row.horaEntrada} - {row.horaSalida}</td>
                          <td className="px-4 py-3 text-slate-600">{row.puesto || 'Sin rol'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(row.estado)}`}>
                              {statusLabel(row.estado)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
