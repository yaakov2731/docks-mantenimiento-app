import { useEffect, useMemo, useState } from 'react'
import { Save, Send } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { GastronomiaModuleNav } from '../../components/GastronomiaModuleNav'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'
import {
  DAY_MS, DEFAULT_ENTRADA, DEFAULT_SALIDA,
  dateKey, draftKey, formatDayLabel, getMonday,
  type DraftTurno,
} from './types'
import { WeekToolbar } from './WeekToolbar'
import { PlanningGrid } from './PlanningGrid'
import { TurnoEditDrawer } from './TurnoEditDrawer'
import { EmployeeSelectorDrawer } from './EmployeeSelectorDrawer'
import { MessagePreviewDrawer, type PreviewItem } from './MessagePreviewDrawer'

export default function GastronomiaPlanificacion() {
  const [weekStartMs, setWeekStartMs] = useState(() => getMonday(new Date()).getTime())
  const [sector, setSector] = useState(SECTORES_GASTRONOMIA[0]?.value ?? 'brooklyn')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [draft, setDraft] = useState<Record<string, DraftTurno>>({})
  const [bulkDay, setBulkDay] = useState('')
  const [bulkEntrada, setBulkEntrada] = useState(DEFAULT_ENTRADA)
  const [bulkSalida, setBulkSalida] = useState(DEFAULT_SALIDA)
  const [bulkPuesto, setBulkPuesto] = useState('')
  const [bulkNota, setBulkNota] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmp, setDrawerEmp] = useState<any | null>(null)
  const [drawerFecha, setDrawerFecha] = useState('')
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [previewAction, setPreviewAction] = useState<(() => Promise<void>) | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<{ published: number; skipped: number } | null>(null)

  const utils = trpc.useUtils()
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dateKey(new Date(weekStartMs + i * DAY_MS))),
    [weekStartMs]
  )
  const desde = weekDays[0]!
  const hasta = dateKey(new Date(weekStartMs + 7 * DAY_MS))

  useEffect(() => { setBulkDay(weekDays[0] ?? '') }, [weekDays])
  useEffect(() => { setSelectedIds([]) }, [sector])

  const { data: empleados = [] } = trpc.gastronomia.listEmpleados.useQuery({ sector, activo: true })
  const { data: turnos = [] } = trpc.gastronomia.listPlanificacion.useQuery({ desde, hasta, sector })
  const empleadosList = empleados as any[]
  const turnosList = turnos as any[]

  const saveMut = trpc.gastronomia.savePlanificacionTurno.useMutation({
    onSuccess: async (_saved, variables) => {
      setDraft(cur => {
        const next = { ...cur }
        delete next[draftKey(variables.empleadoId, variables.fecha)]
        return next
      })
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })
  const deleteMut = trpc.gastronomia.deletePlanificacionTurno.useMutation({
    onSuccess: async () => {
      setDrawerOpen(false)
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })
  const publishMut = trpc.gastronomia.publishPlanificacion.useMutation({
    onSuccess: async result => {
      setPublishResult(result)
      setPreviewOpen(false)
      await utils.gastronomia.listPlanificacion.invalidate()
    },
    onError: err => setErrorMsg(err.message),
  })

  const turnoByCell = useMemo(() => {
    const map = new Map<string, any>()
    turnosList.forEach((t: any) => map.set(`${t.empleadoId}:${t.fecha}`, t))
    return map
  }, [turnosList])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const draftEntries = useMemo(() => Object.values(draft), [draft])
  const draftCount = draftEntries.length
  const selectedEmployees = useMemo(
    () => empleadosList.filter((e: any) => selectedSet.has(e.id)),
    [empleadosList, selectedSet]
  )
  const visibleEmployees = selectedEmployees.length > 0 ? selectedEmployees : empleadosList

  const pendingToSend = turnosList.filter((t: any) => t.estado === 'borrador' || t.estado === 'sin_respuesta').length
  const confirmedCount = turnosList.filter((t: any) => t.estado === 'confirmado').length
  const rejectedCount = turnosList.filter((t: any) => t.estado === 'no_trabaja').length
  const selectedWithoutWhatsapp = selectedEmployees.filter((e: any) => !e.waId).length

  const employeeMetricsById = useMemo(() => {
    const metrics = new Map<number, { rowCount: number; pending: number; confirmed: number; draftCount: number }>()
    for (const t of turnosList) {
      const cur = metrics.get(t.empleadoId) ?? { rowCount: 0, pending: 0, confirmed: 0, draftCount: 0 }
      cur.rowCount += 1
      if (t.estado === 'confirmado') cur.confirmed += 1
      if (t.estado === 'borrador' || t.estado === 'sin_respuesta') cur.pending += 1
      metrics.set(t.empleadoId, cur)
    }
    for (const cell of draftEntries) {
      const cur = metrics.get(cell.empleadoId) ?? { rowCount: 0, pending: 0, confirmed: 0, draftCount: 0 }
      cur.draftCount += 1
      metrics.set(cell.empleadoId, cur)
    }
    return metrics
  }, [draftEntries, turnosList])

  function getCellDraft(emp: any, fecha: string): DraftTurno {
    const key = draftKey(emp.id, fecha)
    const existing = turnoByCell.get(key)
    return draft[key] ?? {
      id: existing?.id,
      empleadoId: emp.id,
      fecha,
      trabaja: existing?.trabaja ?? true,
      horaEntrada: existing?.horaEntrada ?? DEFAULT_ENTRADA,
      horaSalida: existing?.horaSalida ?? DEFAULT_SALIDA,
      sector: existing?.sector ?? emp.sector ?? sector,
      puesto: existing?.puesto ?? emp.puesto ?? '',
      nota: existing?.nota ?? '',
    }
  }

  function openDrawer(emp: any, fecha: string) {
    setDrawerEmp(emp)
    setDrawerFecha(fecha)
    setDrawerOpen(true)
  }

  function handleDraftChange(patch: Partial<DraftTurno>) {
    if (!drawerEmp) return
    const key = draftKey(drawerEmp.id, drawerFecha)
    setDraft(cur => ({ ...cur, [key]: { ...getCellDraft(drawerEmp, drawerFecha), ...patch } }))
  }

  async function handleSaveDrawer() {
    if (!drawerEmp) return
    const cell = getCellDraft(drawerEmp, drawerFecha)
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

  function handleDeleteDrawer() {
    const key = draftKey(drawerEmp!.id, drawerFecha)
    const existing = turnoByCell.get(key)
    if (existing?.id) deleteMut.mutate({ id: existing.id })
  }

  function handleCopyToWeek() {
    if (!drawerEmp) return
    const source = getCellDraft(drawerEmp, drawerFecha)
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      next[draftKey(drawerEmp.id, day)] = {
        ...getCellDraft(drawerEmp, day),
        trabaja: source.trabaja,
        horaEntrada: source.horaEntrada,
        horaSalida: source.horaSalida,
        sector: source.sector,
        puesto: source.puesto,
        nota: source.nota,
      }
    }
    setDraft(cur => ({ ...cur, ...next }))
    setDrawerOpen(false)
  }

  function setWeekWorkState(emp: any, trabaja: boolean) {
    const next: Record<string, DraftTurno> = {}
    for (const day of weekDays) {
      next[draftKey(emp.id, day)] = { ...getCellDraft(emp, day), trabaja }
    }
    setDraft(cur => ({ ...cur, ...next }))
  }

  function applyBulkToDraft() {
    if (selectedEmployees.length === 0 || !bulkDay) return
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
    setDraft(cur => ({ ...cur, ...next }))
  }

  function openBulkSendPreview() {
    if (!bulkDay || selectedEmployees.length === 0) return
    const items: PreviewItem[] = selectedEmployees.map((emp: any) => ({
      turnoId: -emp.id,
      nombre: emp.nombre,
      waId: emp.waId,
      fecha: bulkDay,
      horaEntrada: bulkEntrada,
      horaSalida: bulkSalida,
      puesto: bulkPuesto || undefined,
      nota: bulkNota || undefined,
    }))
    const capturedEmps = [...selectedEmployees]
    const capturedDay = bulkDay
    const capturedEntrada = bulkEntrada
    const capturedSalida = bulkSalida
    const capturedPuesto = bulkPuesto
    const capturedNota = bulkNota
    const capturedSector = sector
    setPreviewItems(items)
    setPreviewAction(() => async () => {
      const saved = await Promise.all(capturedEmps.map((emp: any) => {
        const existing = getCellDraft(emp, capturedDay)
        return saveMut.mutateAsync({
          id: existing.id,
          empleadoId: emp.id,
          fecha: capturedDay,
          trabaja: true,
          horaEntrada: capturedEntrada,
          horaSalida: capturedSalida,
          sector: capturedSector,
          puesto: capturedPuesto || existing.puesto || undefined,
          nota: capturedNota || existing.nota || undefined,
        })
      }))
      const ids = saved.map((item: any) => item?.id).filter(Boolean)
      if (ids.length > 0) publishMut.mutate({ ids })
    })
    setPreviewOpen(true)
  }

  function openPublishWeekPreview() {
    const pending = turnosList.filter(
      (t: any) =>
        (t.estado === 'borrador' || t.estado === 'sin_respuesta') &&
        (selectedIds.length === 0 || selectedSet.has(t.empleadoId))
    )
    if (pending.length === 0) return
    const items: PreviewItem[] = pending.map((t: any) => {
      const emp = empleadosList.find((e: any) => e.id === t.empleadoId)
      return {
        turnoId: t.id,
        nombre: emp?.nombre ?? 'Desconocido',
        waId: emp?.waId,
        fecha: t.fecha,
        horaEntrada: t.horaEntrada,
        horaSalida: t.horaSalida,
        puesto: t.puesto,
        nota: t.nota,
      }
    })
    setPreviewItems(items)
    setPreviewAction(() => async () => {
      publishMut.mutate({ ids: pending.map((t: any) => t.id) })
    })
    setPreviewOpen(true)
  }

  const drawerDraft = drawerEmp && drawerFecha ? getCellDraft(drawerEmp, drawerFecha) : null
  const drawerSavedTurno = drawerEmp && drawerFecha
    ? turnoByCell.get(draftKey(drawerEmp.id, drawerFecha))
    : undefined

  return (
    <DashboardLayout title="Planificación Gastronomía">
      <div className="space-y-4">
        <GastronomiaModuleNav current="planificacion" />

        {errorMsg && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-3 text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {publishResult && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Planificación enviada — {publishResult.published} mensajes enviados, {publishResult.skipped} sin WhatsApp.
            <button onClick={() => setPublishResult(null)} className="ml-3 text-emerald-600 hover:text-emerald-800">✕</button>
          </div>
        )}

        <WeekToolbar
          weekDays={weekDays}
          sector={sector}
          pendingToSend={pendingToSend}
          confirmed={confirmedCount}
          rejected={rejectedCount}
          draftCount={draftCount}
          isPublishing={publishMut.isPending}
          onPrev={() => setWeekStartMs(ms => ms - 7 * DAY_MS)}
          onNext={() => setWeekStartMs(ms => ms + 7 * DAY_MS)}
          onThisWeek={() => setWeekStartMs(getMonday(new Date()).getTime())}
          onSectorChange={v => setSector(v as typeof sector)}
          onPublishWeek={openPublishWeekPreview}
          onOpenEmployeeSelector={() => setEmployeeSelectorOpen(true)}
          selectedCount={selectedIds.length}
          totalCount={empleadosList.length}
        />

        {/* Bulk action panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_110px_110px_1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Día</span>
              <select
                value={bulkDay}
                onChange={e => setBulkDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {weekDays.map(day => {
                  const label = formatDayLabel(day)
                  return <option key={day} value={day}>{label.long} {label.number}</option>
                })}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Entrada</span>
              <input
                type="time"
                value={bulkEntrada}
                onChange={e => setBulkEntrada(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Salida</span>
              <input
                type="time"
                value={bulkSalida}
                onChange={e => setBulkSalida(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Rol</span>
              <input
                value={bulkPuesto}
                onChange={e => setBulkPuesto(e.target.value)}
                placeholder="Caja, cocina, salón"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Nota</span>
              <input
                value={bulkNota}
                onChange={e => setBulkNota(e.target.value)}
                placeholder="Indicaciones"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                onClick={applyBulkToDraft}
                disabled={selectedEmployees.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Save size={15} />
                Cargar
              </button>
              <button
                onClick={openBulkSendPreview}
                disabled={saveMut.isPending || publishMut.isPending || selectedEmployees.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Send size={15} />
                Enviar
              </button>
            </div>
          </div>
          {selectedWithoutWhatsapp > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {selectedWithoutWhatsapp} seleccionado(s) sin WhatsApp — se guardan pero no reciben mensaje.
            </div>
          )}
          {selectedEmployees.length === 0 && (
            <div className="mt-2 text-xs text-slate-400">
              Usá el botón "Empleados" para seleccionar a quienes aplicar el bloque.
            </div>
          )}
          {draftCount > 0 && (
            <div className="mt-2 text-xs font-medium text-amber-700">
              {draftCount} cambio(s) sin guardar — abrí una celda para guardar.
            </div>
          )}
        </div>

        <PlanningGrid
          employees={visibleEmployees}
          weekDays={weekDays}
          turnoByCell={turnoByCell}
          draft={draft}
          employeeMetricsById={employeeMetricsById}
          onCellClick={openDrawer}
          onSetWeekWorkState={setWeekWorkState}
        />

        <TurnoEditDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          emp={drawerEmp}
          fecha={drawerFecha}
          draft={drawerDraft}
          onDraftChange={handleDraftChange}
          onSave={handleSaveDrawer}
          onDelete={handleDeleteDrawer}
          onCopyToWeek={handleCopyToWeek}
          isSaving={saveMut.isPending}
          isDeleting={deleteMut.isPending}
          savedTurno={drawerSavedTurno}
        />

        <EmployeeSelectorDrawer
          open={employeeSelectorOpen}
          onClose={() => setEmployeeSelectorOpen(false)}
          employees={empleadosList}
          selectedIds={selectedIds}
          onToggle={id => setSelectedIds(cur =>
            cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id]
          )}
          onSelectAll={() => setSelectedIds(empleadosList.map((e: any) => e.id))}
          onClearAll={() => setSelectedIds([])}
        />

        <MessagePreviewDrawer
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onConfirm={() => previewAction?.()}
          isLoading={publishMut.isPending || saveMut.isPending}
          items={previewItems}
        />
      </div>
    </DashboardLayout>
  )
}
