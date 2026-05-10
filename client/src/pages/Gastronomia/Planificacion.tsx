import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  MessageSquareText,
  Save,
  Send,
  Trash2,
  Users,
} from 'lucide-react'

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
    long: date.toLocaleDateString('es-AR', { weekday: 'long' }),
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
  const [sector, setSector] = useState(SECTORES_GASTRONOMIA[0]?.value ?? 'brooklyn')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [bulkDay, setBulkDay] = useState('')
  const [bulkEntrada, setBulkEntrada] = useState(defaultEntrada)
  const [bulkSalida, setBulkSalida] = useState(defaultSalida)
  const [bulkPuesto, setBulkPuesto] = useState('')
  const [bulkNota, setBulkNota] = useState('')
  const [draft, setDraft] = useState<Record<string, DraftTurno>>({})
  const deferredEmployeeSearch = useDeferredValue(employeeSearch)

  const utils = trpc.useUtils()
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => dateKey(new Date(weekStartMs + index * DAY_MS))), [weekStartMs])
  const desde = weekDays[0]
  const hasta = dateKey(new Date(weekStartMs + 7 * DAY_MS))

  useEffect(() => {
    setBulkDay(weekDays[0] ?? '')
  }, [weekDays])

  const { data: empleados = [] } = trpc.gastronomia.listEmpleados.useQuery({
    sector,
    activo: true,
  })
  const { data: turnos = [] } = trpc.gastronomia.listPlanificacion.useQuery({
    desde,
    hasta,
    sector,
  })

  const empleadosList = empleados as any[]
  const turnosList = turnos as any[]

  useEffect(() => {
    setSelectedIds([])
  }, [sector])

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
    turnosList.forEach(turno => map.set(`${turno.empleadoId}:${turno.fecha}`, turno))
    return map
  }, [turnosList])

  const draftKey = (empleadoId: number, fecha: string) => `${empleadoId}:${fecha}`
  const getSectorLabel = (value: string) => SECTORES_GASTRONOMIA.find(item => item.value === value)?.label ?? value
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasDraftForCell = (empleadoId: number, fecha: string) => Object.prototype.hasOwnProperty.call(draft, draftKey(empleadoId, fecha))
  const filteredEmployees = useMemo(() => {
    const query = deferredEmployeeSearch.trim().toLowerCase()
    if (!query) return empleadosList
    return empleadosList.filter(emp =>
      String(emp.nombre ?? '').toLowerCase().includes(query)
      || String(emp.puesto ?? '').toLowerCase().includes(query)
    )
  }, [deferredEmployeeSearch, empleadosList])
  const selectedEmployees = useMemo(() => empleadosList.filter(emp => selectedSet.has(emp.id)), [empleadosList, selectedSet])
  const visibleEmployees = selectedEmployees.length > 0 ? selectedEmployees : filteredEmployees
  const draftEntries = useMemo(() => Object.values(draft), [draft])
  const draftCount = draftEntries.length

  const employeeMetricsById = useMemo(() => {
    const metrics = new Map<number, {
      rows: any[]
      rowCount: number
      pending: number
      confirmed: number
      draftCount: number
    }>()

    for (const turno of turnosList) {
      const current = metrics.get(turno.empleadoId) ?? {
        rows: [],
        rowCount: 0,
        pending: 0,
        confirmed: 0,
        draftCount: 0,
      }
      current.rows.push(turno)
      current.rowCount += 1
      if (turno.estado === 'confirmado') current.confirmed += 1
      if (turno.estado === 'borrador' || turno.estado === 'sin_respuesta') current.pending += 1
      metrics.set(turno.empleadoId, current)
    }

    for (const cell of draftEntries) {
      const current = metrics.get(cell.empleadoId) ?? {
        rows: [],
        rowCount: 0,
        pending: 0,
        confirmed: 0,
        draftCount: 0,
      }
      current.draftCount += 1
      metrics.set(cell.empleadoId, current)
    }

    return metrics
  }, [draftEntries, turnosList])

  const draftCountByDay = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cell of draftEntries) {
      counts.set(cell.fecha, (counts.get(cell.fecha) ?? 0) + 1)
    }
    return counts
  }, [draftEntries])

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
      sector: existing?.sector ?? emp.sector ?? sector,
      puesto: existing?.puesto ?? emp.puesto ?? '',
      nota: existing?.nota ?? '',
    }
  }

  function updateCell(emp: any, fecha: string, patch: Partial<DraftTurno>) {
    const key = draftKey(emp.id, fecha)
    setDraft(current => ({ ...current, [key]: { ...getCellDraft(emp, fecha), ...patch } }))
  }

  function toggleSelected(id: number) {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  function selectAllLocal() {
    setSelectedIds(empleadosList.map(emp => emp.id))
  }

  function clearSelected() {
    setSelectedIds([])
  }

  async function saveCell(emp: any, fecha: string) {
    const cell = getCellDraft(emp, fecha)
    await saveMut.mutateAsync({
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

  function setWeekWorkState(emp: any, trabaja: boolean) {
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      next[draftKey(emp.id, day)] = {
        ...getCellDraft(emp, day),
        trabaja,
      }
    }
    setDraft(current => ({ ...current, ...next }))
  }

  function applyBulkToDraft() {
    if (selectedEmployees.length === 0) {
      alert('Seleccioná empleados del local.')
      return
    }
    const next: Record<string, DraftTurno> = {}
    for (const emp of selectedEmployees) {
      const existing = getCellDraft(emp, bulkDay)
      next[draftKey(emp.id, bulkDay)] = {
        ...existing,
        trabaja: true,
        horaEntrada: bulkEntrada,
        horaSalida: bulkSalida,
        sector,
        puesto: bulkPuesto || existing.puesto,
        nota: bulkNota,
      }
    }
    setDraft(current => ({ ...current, ...next }))
  }

  async function saveAndSendSelected() {
    if (selectedEmployees.length === 0) {
      alert('Seleccioná empleados del local.')
      return
    }
    if (!bulkDay) return
    const dayLabel = formatDayLabel(bulkDay)
    if (!window.confirm(`Guardar y enviar ${selectedEmployees.length} turno(s) para ${dayLabel.long} ${dayLabel.number}?`)) return
    const saved = await Promise.all(selectedEmployees.map(emp => {
      const existing = getCellDraft(emp, bulkDay)
      return saveMut.mutateAsync({
        id: existing.id,
        empleadoId: emp.id,
        fecha: bulkDay,
        trabaja: true,
        horaEntrada: bulkEntrada,
        horaSalida: bulkSalida,
        sector,
        puesto: bulkPuesto || existing.puesto || undefined,
        nota: bulkNota || existing.nota || undefined,
      })
    }))
    const ids = saved.map((item: any) => item?.id).filter(Boolean)
    if (ids.length > 0) publishMut.mutate({ ids })
  }

  function publishWeek() {
    const ids = turnosList
      .filter(turno => (turno.estado === 'borrador' || turno.estado === 'sin_respuesta') && (selectedIds.length === 0 || selectedSet.has(turno.empleadoId)))
      .map(turno => turno.id)
    if (ids.length === 0) {
      alert('No hay turnos guardados pendientes para enviar.')
      return
    }
    if (!window.confirm(`Enviar ${ids.length} turno(s) guardados por WhatsApp?`)) return
    publishMut.mutate({ ids })
  }

  const pendingToSend = turnosList.filter(turno => turno.estado === 'borrador' || turno.estado === 'sin_respuesta').length
  const confirmed = turnosList.filter(turno => turno.estado === 'confirmado').length
  const rejected = turnosList.filter(turno => turno.estado === 'no_trabaja').length
  const selectedWithoutWhatsapp = selectedEmployees.filter(emp => !emp.waId).length
  const scopeEmployeesCount = selectedEmployees.length > 0 ? selectedEmployees.length : filteredEmployees.length
  const daySummary = useMemo(() => {
    return weekDays.map(day => {
      const rows = turnosList.filter(turno => turno.fecha === day)
      const draftCells = Object.values(draft).filter(cell => cell.fecha === day).length
      return {
        day,
        saved: rows.length,
        confirmed: rows.filter(turno => turno.estado === 'confirmado').length,
        pending: rows.filter(turno => turno.estado === 'borrador' || turno.estado === 'sin_respuesta').length,
        rejected: rows.filter(turno => turno.estado === 'no_trabaja').length,
        drafts: draftCountByDay.get(day) ?? 0,
      }
    })
  }, [draftCountByDay, turnosList, weekDays])

  return (
    <DashboardLayout title="Planificación Gastronomía">
      <div className="gastro-premium space-y-5">
        <GastronomiaModuleNav current="planificacion" />

        <section className="gastro-hero rounded-[34px] p-5 text-white shadow-sm md:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="gastro-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                <CalendarDays size={14} />
                Planificación por local
              </div>
              <h1 className="mt-3 font-heading text-[28px] font-semibold leading-tight text-white md:text-[40px]">
                Diseñá la semana con precisión y enviá confirmaciones sin fricción.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Seleccionás el local, armás el bloque operativo y publicás solo al equipo que corresponda. Más compacto, más legible, más rápido de usar en semana cargada.
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
                Volver a esta semana
              </button>
            </div>
          </div>
        </section>

        <section className="gastro-intro rounded-[28px] p-4 md:p-5">
          <div className="relative grid gap-3 lg:grid-cols-4">
            {[
              { step: '01', title: 'Elegí local', text: 'Filtrás equipo del local antes de editar.' },
              { step: '02', title: 'Marcá equipo', text: 'Seleccionás solo a quienes reciben carga o envío.' },
              { step: '03', title: 'Aplicá bloque', text: 'Usás día, horario, rol y nota como base rápida.' },
              { step: '04', title: 'Revisá y enviá', text: 'Guardás celdas o enviás pendientes por WhatsApp.' },
            ].map(item => (
              <div key={item.step} className="gastro-intro-side rounded-[22px] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">{item.step}</div>
                <div className="mt-2 font-heading text-lg font-semibold text-slate-950">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
          <div className="gastro-panel rounded-[28px] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Locales</div>
                <div className="font-heading text-xl font-semibold text-slate-950">Seleccioná un local</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{empleadosList.length} empleados</div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {SECTORES_GASTRONOMIA.map(item => {
                const active = sector === item.value
                const count = active ? empleadosList.length : null
                return (
                  <button
                    key={item.value}
                    onClick={() => setSector(item.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15' : 'border-slate-200 bg-white/90 text-slate-700 hover:border-emerald-300'}`}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    {count !== null && <div className="mt-1 text-[11px] opacity-70">{count} activos</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="gastro-panel rounded-[28px] p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Seleccionados</div>
                <div className="mt-1 flex items-center gap-2 font-heading text-3xl font-semibold text-slate-900"><Users size={20} />{selectedEmployees.length}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Pendientes</div>
                <div className="mt-1 font-heading text-3xl font-semibold text-sky-800">{pendingToSend}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Confirmados</div>
                <div className="mt-1 font-heading text-3xl font-semibold text-emerald-800">{confirmed}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">No trabajan</div>
                <div className="mt-1 font-heading text-3xl font-semibold text-rose-800">{rejected}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="gastro-panel rounded-[26px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Radar semanal</div>
              <div className="mt-1 font-heading text-xl font-semibold text-slate-950">
                {getSectorLabel(sector)} · {scopeEmployeesCount} {selectedEmployees.length > 0 ? 'seleccionados' : 'visibles'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Leé rápido qué días ya están cargados, qué queda pendiente y dónde tenés cambios sin guardar.
              </div>
            </div>
            <button
              onClick={publishWeek}
              disabled={publishMut.isLoading || pendingToSend === 0}
              className="gastro-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40 active:scale-[0.98]"
            >
              <MessageSquareText size={15} />
              Enviar pendientes
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {daySummary.map(item => {
              const label = formatDayLabel(item.day)
              return (
                <div key={item.day} className="gastro-panel-muted rounded-[22px] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label.short}</div>
                      <div className="font-semibold text-slate-900">{label.number}</div>
                    </div>
                    {item.drafts > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {item.drafts} sin guardar
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-white px-2.5 py-2 text-slate-600">
                      <div className="text-slate-400">Cargados</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{item.saved}</div>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-slate-600">
                      <div className="text-slate-400">Pendientes</div>
                      <div className="mt-0.5 font-semibold text-sky-800">{item.pending}</div>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-slate-600">
                      <div className="text-slate-400">Confirmó</div>
                      <div className="mt-0.5 font-semibold text-emerald-800">{item.confirmed}</div>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-slate-600">
                      <div className="text-slate-400">No va</div>
                      <div className="mt-0.5 font-semibold text-rose-800">{item.rejected}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[330px_1fr]">
          <aside className="gastro-panel rounded-[26px] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Nómina</div>
                <h2 className="font-heading text-lg font-semibold text-slate-950">{getSectorLabel(sector)}</h2>
                <div className="mt-1 text-xs text-slate-500">{selectedEmployees.length} de {empleadosList.length} seleccionados</div>
              </div>
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {filteredEmployees.length} visibles
              </div>
            </div>

            <div className="gastro-panel-muted mt-3 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Search size={14} />
                <input
                  value={employeeSearch}
                  onChange={event => setEmployeeSearch(event.target.value)}
                  placeholder="Buscar empleado o rol"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={selectAllLocal}
                className="gastro-button-soft rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                Seleccionar todos
              </button>
              <button
                onClick={clearSelected}
                className="gastro-button-soft rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600"
              >
                Deseleccionar todos
              </button>
            </div>

            <div className="gastro-grid-lines mt-3 max-h-[560px] overflow-y-auto rounded-2xl border border-slate-200/80">
              {filteredEmployees.map((emp, index) => {
                const checked = selectedSet.has(emp.id)
                return (
                  <label
                    key={emp.id}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition ${index !== filteredEmployees.length - 1 ? 'border-b border-slate-100' : ''} ${checked ? 'bg-emerald-50/80' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(emp.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{emp.nombre}</div>
                      <div className="truncate text-[11px] text-slate-500">{emp.puesto || 'Sin rol'}</div>
                    </div>
                    {!emp.waId && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Sin WA</span>}
                  </label>
                )
              })}
              {filteredEmployees.length === 0 && <div className="p-6 text-center text-sm text-slate-400">No hay empleados para ese filtro.</div>}
            </div>
          </aside>

          <div className="space-y-4">
            <section className="gastro-panel rounded-[22px] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Selección activa</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users size={15} />
                    {selectedEmployees.length > 0 ? `${selectedEmployees.length} empleado(s) recibirán el mensaje` : 'Sin selección, se muestra todo el local'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {draftCount > 0 ? `${draftCount} cambio(s) sin guardar detectados en la vista.` : 'Sin cambios pendientes en borrador.'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={selectAllLocal}
                    className="gastro-button-soft rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={clearSelected}
                    className="gastro-button-soft rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>
            </section>

            <section className="gastro-panel rounded-[28px] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_110px_110px_1fr_1fr_auto]">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Día</span>
                  <select value={bulkDay} onChange={event => setBulkDay(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    {weekDays.map(day => {
                      const label = formatDayLabel(day)
                      return <option key={day} value={day}>{label.long} {label.number}</option>
                    })}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Entrada</span>
                  <input type="time" value={bulkEntrada} onChange={event => setBulkEntrada(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Salida</span>
                  <input type="time" value={bulkSalida} onChange={event => setBulkSalida(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Rol</span>
                  <input value={bulkPuesto} onChange={event => setBulkPuesto(event.target.value)} placeholder="Caja, cocina, salón" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Nota</span>
                  <input value={bulkNota} onChange={event => setBulkNota(event.target.value)} placeholder="Indicaciones" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
                <div className="flex items-end gap-2">
                  <button onClick={applyBulkToDraft} className="gastro-button-soft inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-slate-700 active:scale-[0.98]">
                    <Save size={15} />
                    Cargar
                  </button>
                  <button onClick={saveAndSendSelected} disabled={saveMut.isLoading || publishMut.isLoading || selectedEmployees.length === 0} className="gastro-button-dark inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-[0.98]">
                    <Send size={15} />
                    Enviar
                  </button>
                </div>
              </div>
              {selectedWithoutWhatsapp > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Hay {selectedWithoutWhatsapp} seleccionado(s) sin WhatsApp. Se guardan, pero no se puede enviar mensaje.
                </div>
              )}
            </section>

            {draftCount > 0 && (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Tenés {draftCount} cambio(s) sin guardar. Podés guardar una celda o usar Enviar para guardar y mandar el día seleccionado.
              </div>
            )}

            <section className="gastro-panel rounded-[28px] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Calendario del local</div>
                  <h2 className="font-heading text-xl font-semibold text-slate-950">{selectedEmployees.length > 0 ? 'Empleados seleccionados' : 'Todos los empleados del local'}</h2>
                </div>
                <button
                  onClick={publishWeek}
                  disabled={publishMut.isLoading || pendingToSend === 0}
                  className="gastro-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40 active:scale-[0.98]"
                >
                  <MessageSquareText size={15} />
                  Enviar pendientes
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="gastro-table min-w-[1180px] w-full border-separate border-spacing-0 text-sm">
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
                    {visibleEmployees.map(emp => {
                      const employeeMetrics = employeeMetricsById.get(emp.id)
                      const employeeRows = employeeMetrics?.rows ?? []
                      const employeeDrafts = employeeMetrics?.draftCount ?? 0
                      const employeeConfirmed = employeeMetrics?.confirmed ?? 0
                      const employeePending = employeeMetrics?.pending ?? 0
                      return (
                      <tr key={emp.id} className="align-top">
                        <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-3">
                          <div className="font-semibold text-slate-900">{emp.nombre}</div>
                          <div className="mt-1 text-xs text-slate-500">{emp.puesto || 'Sin rol'}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{employeeRows.length} cargados</span>
                            {employeePending > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{employeePending} pendientes</span>}
                            {employeeConfirmed > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{employeeConfirmed} confirmados</span>}
                            {employeeDrafts > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{employeeDrafts} sin guardar</span>}
                          </div>
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={() => setWeekWorkState(emp, true)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Semana completa
                            </button>
                            <button
                              onClick={() => setWeekWorkState(emp, false)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                            >
                              Limpiar semana
                            </button>
                          </div>
                          {!emp.waId && <div className="mt-2 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Sin WhatsApp</div>}
                        </td>
                        {weekDays.map(day => {
                          const cell = getCellDraft(emp, day)
                          const existing = turnoByCell.get(draftKey(emp.id, day))
                          const dirty = hasDraftForCell(emp.id, day)
                          return (
                            <td key={day} className="border-l border-t border-slate-100 px-2 py-3">
                              <div className={`rounded-[18px] border p-2 ${dirty ? 'border-amber-300 bg-amber-50/55 ring-1 ring-amber-200' : cell.trabaja ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input type="checkbox" checked={cell.trabaja} onChange={event => updateCell(emp, day, { trabaja: event.target.checked })} />
                                    Trabaja
                                  </label>
                                  <div className="flex flex-wrap items-center justify-end gap-1">
                                    {dirty && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Sin guardar</span>}
                                    {existing && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(existing.estado)}`}>{statusLabel(existing.estado)}</span>}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <input type="time" value={cell.horaEntrada} disabled={!cell.trabaja} onChange={event => updateCell(emp, day, { horaEntrada: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40" />
                                  <input type="time" value={cell.horaSalida} disabled={!cell.trabaja} onChange={event => updateCell(emp, day, { horaSalida: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40" />
                                </div>
                                <input value={cell.puesto} disabled={!cell.trabaja} onChange={event => updateCell(emp, day, { puesto: event.target.value })} placeholder="Rol" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40" />
                                <input value={cell.nota} disabled={!cell.trabaja} onChange={event => updateCell(emp, day, { nota: event.target.value })} placeholder="Nota" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-40" />
                                <div className="mt-2 grid grid-cols-3 gap-1">
                                  <button title="Guardar" onClick={() => saveCell(emp, day)} disabled={saveMut.isLoading} className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-2 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-40"><Save size={13} /></button>
                                  <button title="Copiar a toda la semana" onClick={() => copyToWeek(emp, day)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-slate-600 hover:border-emerald-300"><Copy size={13} /></button>
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
                                {existing?.estado === 'confirmado' && <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} />Confirmó</div>}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )})}
                    {visibleEmployees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Sin empleados activos para este local.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
