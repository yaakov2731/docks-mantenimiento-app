import { useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import { CalendarDays, CheckCircle2, Copy, MessageSquareText, Save, Trash2, Users } from 'lucide-react'

type DraftTurno = {
  id?: number
  empleadoId: number
  fecha: string
  trabaja: boolean
  horaEntrada: string
  horaSalida: string
  sector: string
  puesto: string
  nota: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const defaultEntrada = '18:00'
const defaultSalida = '00:00'

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

function formatDayLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return {
    short: date.toLocaleDateString('es-AR', { weekday: 'short' }),
    number: date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
  }
}

function statusLabel(status?: string) {
  if (status === 'confirmado') return 'Confirmado'
  if (status === 'no_trabaja') return 'No trabaja'
  if (status === 'enviado') return 'Enviado'
  if (status === 'sin_respuesta') return 'Sin respuesta'
  if (status === 'cancelado') return 'Cancelado'
  return 'Borrador'
}

function statusClass(status?: string) {
  if (status === 'confirmado') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'no_trabaja') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (status === 'enviado') return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

export default function GastronomiaPlanificacion() {
  const [weekStartMs, setWeekStartMs] = useState(() => getMonday(new Date()).getTime())
  const [sector, setSector] = useState('todos')
  const [draft, setDraft] = useState<Record<string, DraftTurno>>({})

  const utils = trpc.useUtils()
  const weekStart = new Date(weekStartMs)
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => dateKey(new Date(weekStartMs + index * DAY_MS))), [weekStartMs])
  const desde = weekDays[0]
  const hasta = dateKey(new Date(weekStartMs + 7 * DAY_MS))

  const { data: empleados = [] } = trpc.gastronomia.listEmpleados.useQuery({
    sector: sector === 'todos' ? undefined : sector,
    activo: true,
  })
  const { data: turnos = [] } = trpc.gastronomia.listPlanificacion.useQuery({
    desde,
    hasta,
    sector: sector === 'todos' ? undefined : sector,
  })

  const saveMut = trpc.gastronomia.savePlanificacionTurno.useMutation({
    onSuccess: async (_saved, variables) => {
      setDraft(current => {
        const next = { ...current }
        delete next[draftKey(variables.empleadoId, variables.fecha)]
        return next
      })
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: error => alert(error.message),
  })
  const deleteMut = trpc.gastronomia.deletePlanificacionTurno.useMutation({
    onSuccess: async () => {
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: error => alert(error.message),
  })
  const publishMut = trpc.gastronomia.publishPlanificacion.useMutation({
    onSuccess: async result => {
      await utils.gastronomia.listPlanificacion.invalidate()
      alert(`Planificación enviada. Mensajes: ${result.published}. Sin WhatsApp: ${result.skipped}.`)
    },
    onError: error => alert(error.message),
  })

  const turnoByCell = useMemo(() => {
    const map = new Map<string, any>()
    ;(turnos as any[]).forEach(turno => map.set(`${turno.empleadoId}:${turno.fecha}`, turno))
    return map
  }, [turnos])

  const draftKey = (empleadoId: number, fecha: string) => `${empleadoId}:${fecha}`
  const getSectorLabel = (value: string) => SECTORES_GASTRONOMIA.find(item => item.value === value)?.label ?? value

  function getCellDraft(emp: any, fecha: string): DraftTurno {
    const key = draftKey(emp.id, fecha)
    const existing = turnoByCell.get(key)
    return draft[key] ?? {
      id: existing?.id,
      empleadoId: emp.id,
      fecha,
      trabaja: existing?.trabaja ?? true,
      horaEntrada: existing?.horaEntrada ?? defaultEntrada,
      horaSalida: existing?.horaSalida ?? defaultSalida,
      sector: existing?.sector ?? emp.sector ?? 'brooklyn',
      puesto: existing?.puesto ?? emp.puesto ?? '',
      nota: existing?.nota ?? '',
    }
  }

  function updateCell(emp: any, fecha: string, patch: Partial<DraftTurno>) {
    const key = draftKey(emp.id, fecha)
    setDraft(current => ({ ...current, [key]: { ...getCellDraft(emp, fecha), ...patch } }))
  }

  function saveCell(emp: any, fecha: string) {
    const cell = getCellDraft(emp, fecha)
    saveMut.mutate({
      id: cell.id,
      empleadoId: cell.empleadoId,
      fecha: cell.fecha,
      trabaja: cell.trabaja,
      horaEntrada: cell.horaEntrada,
      horaSalida: cell.horaSalida,
      sector: cell.sector,
      puesto: cell.puesto || undefined,
      nota: cell.nota || undefined,
    })
  }

  function copyToWeek(emp: any, fecha: string) {
    const source = getCellDraft(emp, fecha)
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      const existing = getCellDraft(emp, day)
      next[draftKey(emp.id, day)] = {
        ...existing,
        trabaja: source.trabaja,
        horaEntrada: source.horaEntrada,
        horaSalida: source.horaSalida,
        sector: source.sector,
        puesto: source.puesto,
        nota: source.nota,
      }
    }
    setDraft(current => ({ ...current, ...next }))
  }

  function publishWeek() {
    const ids = (turnos as any[])
      .filter(turno => turno.estado === 'borrador' || turno.estado === 'sin_respuesta')
      .map(turno => turno.id)
    if (ids.length === 0) {
      alert('No hay turnos guardados pendientes para enviar.')
      return
    }
    if (!window.confirm(`Enviar ${ids.length} turno(s) por WhatsApp?`)) return
    publishMut.mutate({ ids })
  }

  const draftCount = Object.keys(draft).length
  const pendingToSend = (turnos as any[]).filter(turno => turno.estado === 'borrador' || turno.estado === 'sin_respuesta').length
  const confirmed = (turnos as any[]).filter(turno => turno.estado === 'confirmado').length
  const rejected = (turnos as any[]).filter(turno => turno.estado === 'no_trabaja').length

  return (
    <DashboardLayout title="Planificación Gastronomía">
      <div className="space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <CalendarDays size={14} />
                Semana operativa
              </div>
              <h1 className="mt-3 font-heading text-[30px] md:text-[38px] font-semibold leading-tight text-slate-950">
                Planificá horarios y confirmá asistencia por WhatsApp.
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Editá entradas, salidas, local, rol y franco por empleado. Después publicás la semana y el bot toma las confirmaciones.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setWeekStartMs(ms => ms - 7 * DAY_MS)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300"
              >
                Semana anterior
              </button>
              <button
                onClick={() => setWeekStartMs(getMonday(new Date()).getTime())}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
              >
                Esta semana
              </button>
              <button
                onClick={() => setWeekStartMs(ms => ms + 7 * DAY_MS)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300"
              >
                Semana siguiente
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
              Desde {desde} hasta {weekDays[6]}
            </div>
            <select
              value={sector}
              onChange={event => setSector(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="todos">Todos los locales</option>
              {SECTORES_GASTRONOMIA.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button
              onClick={publishWeek}
              disabled={publishMut.isLoading || pendingToSend === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <MessageSquareText size={15} />
              Publicar y enviar WhatsApp
            </button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Empleados</div>
            <div className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-900"><Users size={20} />{(empleados as any[]).length}</div>
          </div>
          <div className="rounded-[22px] border border-sky-200 bg-sky-50 p-4 shadow-sm text-sky-900">
            <div className="text-[11px] uppercase tracking-wide opacity-65">Pendientes de enviar</div>
            <div className="mt-2 font-heading text-3xl font-semibold">{pendingToSend}</div>
          </div>
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm text-emerald-900">
            <div className="text-[11px] uppercase tracking-wide opacity-65">Confirmados</div>
            <div className="mt-2 font-heading text-3xl font-semibold">{confirmed}</div>
          </div>
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 shadow-sm text-rose-900">
            <div className="text-[11px] uppercase tracking-wide opacity-65">No trabajan</div>
            <div className="mt-2 font-heading text-3xl font-semibold">{rejected}</div>
          </div>
        </section>

        {draftCount > 0 && (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Tenés {draftCount} cambio(s) sin guardar. Guardá cada celda o copiá y guardá por día.
          </div>
        )}

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-[220px] bg-white px-3 py-3 text-left font-semibold text-slate-700">Empleado</th>
                  {weekDays.map(day => {
                    const label = formatDayLabel(day)
                    return (
                      <th key={day} className="min-w-[150px] border-l border-slate-100 bg-white px-2 py-3 text-left">
                        <div className="text-xs uppercase tracking-wide text-slate-400">{label.short}</div>
                        <div className="font-semibold text-slate-800">{label.number}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {(empleados as any[]).map(emp => (
                  <tr key={emp.id} className="align-top">
                    <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-3">
                      <div className="font-semibold text-slate-900">{emp.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500">{getSectorLabel(emp.sector)} · {emp.puesto || 'Sin rol'}</div>
                      {!emp.waId && <div className="mt-2 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Sin WhatsApp</div>}
                    </td>
                    {weekDays.map(day => {
                      const cell = getCellDraft(emp, day)
                      const existing = turnoByCell.get(draftKey(emp.id, day))
                      return (
                        <td key={day} className="border-l border-t border-slate-100 px-2 py-3">
                          <div className={`rounded-[18px] border p-2 ${cell.trabaja ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={cell.trabaja}
                                  onChange={event => updateCell(emp, day, { trabaja: event.target.checked })}
                                />
                                Trabaja
                              </label>
                              {existing && (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(existing.estado)}`}>
                                  {statusLabel(existing.estado)}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1">
                              <input
                                type="time"
                                value={cell.horaEntrada}
                                disabled={!cell.trabaja}
                                onChange={event => updateCell(emp, day, { horaEntrada: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                              />
                              <input
                                type="time"
                                value={cell.horaSalida}
                                disabled={!cell.trabaja}
                                onChange={event => updateCell(emp, day, { horaSalida: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                              />
                            </div>

                            <select
                              value={cell.sector}
                              disabled={!cell.trabaja}
                              onChange={event => updateCell(emp, day, { sector: event.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                            >
                              {SECTORES_GASTRONOMIA.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                            <input
                              value={cell.puesto}
                              disabled={!cell.trabaja}
                              onChange={event => updateCell(emp, day, { puesto: event.target.value })}
                              placeholder="Rol"
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                            />
                            <input
                              value={cell.nota}
                              disabled={!cell.trabaja}
                              onChange={event => updateCell(emp, day, { nota: event.target.value })}
                              placeholder="Nota"
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                            />

                            <div className="mt-2 grid grid-cols-3 gap-1">
                              <button
                                title="Guardar"
                                onClick={() => saveCell(emp, day)}
                                disabled={saveMut.isLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-2 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-40"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                title="Copiar a toda la semana"
                                onClick={() => copyToWeek(emp, day)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-slate-600 hover:border-emerald-300"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                title="Borrar turno"
                                disabled={!existing?.id || deleteMut.isLoading}
                                onClick={() => {
                                  if (!existing?.id) return
                                  if (!window.confirm('Borrar este turno planificado?')) return
                                  deleteMut.mutate({ id: existing.id })
                                }}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-slate-400 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {existing?.estado === 'confirmado' && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} />
                                Confirmó
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {(empleados as any[]).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Sin empleados activos para este local.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
