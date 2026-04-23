import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '../ui/button'

type Priority = 'baja' | 'media' | 'alta' | 'urgente'

type EmployeeOption = {
  id: number
  nombre: string
  waId?: string | null
}

export type ImportedOperationalTaskInput = {
  tipoTrabajo: string
  titulo: string
  descripcion: string
  ubicacion: string
  prioridad: Priority
  empleadoId?: number
  ordenAsignacion?: number
}

type ImportedTaskPreview = ImportedOperationalTaskInput & {
  sourceRow: number
  sourceDay?: string
  sourceTime?: string
  empleadoTexto?: string
  empleadoNombre?: string
  warnings: string[]
}

type ParseResult = {
  tasks: ImportedTaskPreview[]
  skippedRows: number
}

type TaskExcelImportProps = {
  empleados: EmployeeOption[]
  onSubmit: (tasks: ImportedOperationalTaskInput[], fileName?: string) => Promise<void> | void
  isSubmitting?: boolean
}

const EMPLOYEE_ALIASES = [
  'empleado',
  'responsable',
  'asignado',
  'asignado a',
  'persona',
  'operario',
  'trabajador',
  'colaborador',
  'nombre empleado',
]

const TITLE_ALIASES = ['tarea', 'titulo', 'actividad', 'trabajo', 'detalle tarea', 'descripcion tarea']
const TITLE_BASES = ['tarea', 'titulo', 'actividad', 'trabajo']
const DESCRIPTION_ALIASES = ['descripcion', 'detalle', 'observacion', 'observaciones', 'instruccion', 'instrucciones']
const LOCATION_ALIASES = ['ubicacion', 'lugar', 'sector', 'local', 'area', 'zona']
const TYPE_ALIASES = ['tipo', 'tipo trabajo', 'tipo de trabajo', 'categoria', 'rubro']
const PRIORITY_ALIASES = ['prioridad', 'urgencia']
const ORDER_ALIASES = ['orden', 'secuencia', 'nro', 'numero']
const WEEK_DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
const REST_VALUES = ['franco', 'almuerzo', 'descanso']

type NormalizedEntry = {
  key: string
  normalized: string
  value: unknown
}

type PdfTextCell = {
  text: string
  x: number
  y: number
}

export function parseTaskRows(rows: Record<string, unknown>[], empleados: EmployeeOption[]): ParseResult {
  const tasks: ImportedTaskPreview[] = []
  let skippedRows = 0

  rows.forEach((row, rowIndex) => {
    const entries = normalizeEntries(row)
    const baseTitle = cleanText(getCell(entries, TITLE_ALIASES))
    const slots = baseTitle ? [undefined] : getTaskSlots(entries)
    const slotsToParse = slots.length > 0 ? slots : [undefined]
    let parsedInRow = 0

    slotsToParse.forEach((slot) => {
      const titulo = cleanText(slot ? getSlotCell(entries, TITLE_BASES, slot) : baseTitle)
      if (titulo.length < 3) return

      const empleadoTexto = cleanText(getCell(entries, EMPLOYEE_ALIASES))
      const empleado = matchEmployee(empleadoTexto, empleados)
      const priorityResult = normalizePriority(
        cleanText(slot ? getSlotCell(entries, ['prioridad', 'urgencia'], slot) : getCell(entries, PRIORITY_ALIASES))
      )
      const tipoTrabajo = cleanText(slot ? getSlotCell(entries, ['tipo', 'categoria', 'rubro'], slot) : getCell(entries, TYPE_ALIASES)) || 'tarea_diaria'
      const ubicacion = cleanText(slot ? getSlotCell(entries, ['ubicacion', 'lugar', 'sector', 'local', 'area', 'zona'], slot) : getCell(entries, LOCATION_ALIASES)) || 'Shopping'
      const descripcion = cleanText(slot ? getSlotCell(entries, ['descripcion', 'detalle', 'observacion'], slot) : getCell(entries, DESCRIPTION_ALIASES)) || titulo
      const ordenAsignacion = parseOrder(slot ? getSlotCell(entries, ['orden', 'secuencia'], slot) : getCell(entries, ORDER_ALIASES))
      const warnings: string[] = []

      if (!empleadoTexto) {
        warnings.push('Sin responsable en la fila')
      } else if (!empleado) {
        warnings.push(`No coincide con empleados activos: ${empleadoTexto}`)
      }
      if (priorityResult.warning) warnings.push(priorityResult.warning)

      tasks.push({
        sourceRow: rowIndex + 2,
        tipoTrabajo,
        titulo,
        descripcion,
        ubicacion,
        prioridad: priorityResult.priority,
        empleadoId: empleado?.id,
        empleadoNombre: empleado?.nombre,
        empleadoTexto,
        ordenAsignacion,
        warnings,
      })
      parsedInRow += 1
    })

    if (parsedInRow === 0) skippedRows += 1
  })

  return { tasks, skippedRows }
}

export function parseTaskWorkbookRows(rows: unknown[][], empleados: EmployeeOption[]): ParseResult {
  const schedule = parseScheduleMatrixRows(rows, empleados)
  if (schedule.tasks.length > 0) return schedule

  const [headerRowIndex, headers] = findGenericHeaderRow(rows)
  if (!headers) return { tasks: [], skippedRows: rows.length }

  const objectRows = rows.slice(headerRowIndex + 1).map((row) => {
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      if (!header) return
      record[header] = row[index] ?? ''
    })
    return record
  })

  return parseTaskRows(objectRows, empleados)
}

function parseWorkbookBuffer(buffer: ArrayBuffer, empleados: EmployeeOption[]): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('El archivo no tiene hojas para leer.')
  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false })
  return parseTaskWorkbookRows(rows, empleados)
}

async function parsePdfScheduleFile(buffer: ArrayBuffer, empleados: EmployeeOption[]): Promise<ParseResult> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  const matrixRows: unknown[][] = []
  let columnXs: number[] | null = null
  let headerLabels: string[] | null = null
  let pendingPreRows: string[][] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const cells: PdfTextCell[] = (content.items as any[])
      .map((item) => ({
        text: cleanText(item.str),
        x: Number(item.transform?.[4] ?? 0),
        y: Number(item.transform?.[5] ?? 0),
      }))
      .filter((item) => item.text.length > 0)

    const textRows = groupPdfTextRows(cells)
    for (let rowIndex = 0; rowIndex < textRows.length; rowIndex += 1) {
      const textRow = textRows[rowIndex]
      const rowText = textRow.map((item) => item.text).join(' ')
      if (!columnXs) {
        const header = detectPdfScheduleHeader(textRow)
        if (header) {
          columnXs = header.xs
          headerLabels = header.labels
          matrixRows.push(header.labels)
        }
        continue
      }

      const byColumn = assignPdfCellsToColumns(textRow, columnXs)
      const firstCell = byColumn[0] ?? ''

      if (isDaySection(rowText)) {
        pendingPreRows = []
        matrixRows.push([normalizeDayLabel(rowText), ...Array((headerLabels?.length ?? 1) - 1).fill('')])
        continue
      }

      if (isTimeRange(firstCell)) {
        const slotRows = [...pendingPreRows, byColumn]
        pendingPreRows = []

        let previousY = textRow[0].y
        let lookahead = rowIndex + 1
        while (lookahead < textRows.length) {
          const nextRow = textRows[lookahead]
          const nextRowText = nextRow.map((item) => item.text).join(' ')
          const nextByColumn = assignPdfCellsToColumns(nextRow, columnXs)
          const nextFirstCell = nextByColumn[0] ?? ''
          const yGap = previousY - nextRow[0].y

          if (isDaySection(nextRowText) || isTimeRange(nextFirstCell) || yGap > 9) break
          slotRows.push(nextByColumn)
          previousY = nextRow[0].y
          lookahead += 1
        }

        rowIndex = lookahead - 1
        matrixRows.push([
          firstCell,
          ...columnXs.slice(1).map((_, employeeIndex) =>
            slotRows
              .map((slotRow) => slotRow[employeeIndex + 1])
              .filter(Boolean)
              .join(' ')
              .trim()
          ),
        ])
        continue
      }

      pendingPreRows.push(byColumn)
    }
  }

  return parseTaskWorkbookRows(matrixRows, empleados)
}

export function TaskExcelImport({
  empleados,
  onSubmit,
  isSubmitting = false,
}: TaskExcelImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState<string>()
  const [tasks, setTasks] = useState<ImportedTaskPreview[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [skippedRows, setSkippedRows] = useState(0)
  const [parseError, setParseError] = useState<string>()
  const [lastImport, setLastImport] = useState<string>()

  const availableDays = useMemo(
    () => [...new Set(tasks.map((task) => task.sourceDay).filter((day): day is string => Boolean(day)))],
    [tasks]
  )

  const visibleTasks = useMemo(
    () => selectedDay ? tasks.filter((task) => task.sourceDay === selectedDay) : tasks,
    [selectedDay, tasks]
  )

  const summary = useMemo(() => {
    const assigned = visibleTasks.filter((task) => task.empleadoId).length
    const unassigned = visibleTasks.length - assigned
    const warningCount = visibleTasks.reduce((total, task) => total + task.warnings.length, 0)
    return { assigned, unassigned, warningCount }
  }, [visibleTasks])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setParseError(undefined)
    setLastImport(undefined)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const result = file.name.toLowerCase().endsWith('.pdf')
        ? await parsePdfScheduleFile(buffer, empleados)
        : parseWorkbookBuffer(buffer, empleados)
      setTasks(result.tasks)
      setSkippedRows(result.skippedRows)
      const days = [...new Set(result.tasks.map((task) => task.sourceDay).filter((day): day is string => Boolean(day)))]
      setSelectedDay(resolveDefaultDay(days))
      if (result.tasks.length === 0) {
        setParseError('No encontré tareas válidas en la planilla.')
      }
    } catch (error: any) {
      setTasks([])
      setSelectedDay('')
      setSkippedRows(0)
      setParseError(error?.message ?? 'No se pudo leer la planilla.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleImport() {
    if (visibleTasks.length === 0) return
    await onSubmit(visibleTasks.map(({ sourceRow, sourceDay, sourceTime, empleadoTexto, empleadoNombre, warnings, ...task }) => task), fileName)
    setLastImport(`${visibleTasks.length} tarea${visibleTasks.length === 1 ? '' : 's'} importada${visibleTasks.length === 1 ? '' : 's'}.`)
    setTasks([])
    setSelectedDay('')
    setSkippedRows(0)
    setFileName(undefined)
    setParseError(undefined)
  }

  return (
    <section className="surface-panel relative overflow-hidden rounded-[22px] border border-[#E3E8EE] p-5 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(135deg,rgba(34,197,94,0.08),rgba(14,116,144,0.08),transparent)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Plantilla diaria</div>
          <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Importar tareas desde Excel</h3>
          <p className="mt-2 text-sm text-slate-500">
            Las filas asignadas quedan pendientes de confirmación y aparecen en el bot dentro de Mis tareas.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
        >
          Seleccionar PDF / Excel
        </button>
      </div>

      <div className="relative mt-4 grid gap-3">
        {fileName ? (
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{fileName}</span>
            <span className="ml-2 text-slate-400">Filas omitidas: {skippedRows}</span>
          </div>
        ) : null}

        {parseError ? (
          <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {parseError}
          </div>
        ) : null}

        {lastImport ? (
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {lastImport}
          </div>
        ) : null}

        {tasks.length > 0 ? (
          <>
            {availableDays.length > 0 ? (
              <div className="rounded-[16px] border border-cyan-100 bg-cyan-50 px-4 py-3">
                <label className="grid gap-2 text-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                    Día a cargar en operaciones
                  </span>
                  <select
                    value={selectedDay}
                    onChange={(event) => setSelectedDay(event.target.value)}
                    className="w-full rounded-[12px] border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  >
                    {availableDays.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-3">
              <Metric label="Tareas" value={visibleTasks.length} />
              <Metric label="Asignadas" value={summary.assigned} />
              <Metric label="Sin asignar" value={summary.unassigned} tone={summary.unassigned > 0 ? 'warn' : 'ok'} />
            </div>

            {summary.warningCount > 0 ? (
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Hay {summary.warningCount} aviso{summary.warningCount === 1 ? '' : 's'} en la vista previa. Las tareas sin empleado se crean sin asignar.
              </div>
            ) : null}

            <div className="max-h-72 overflow-y-auto rounded-[18px] border border-slate-200 bg-white">
              {visibleTasks.slice(0, 40).map((task) => (
                <div key={`${task.sourceRow}-${task.titulo}-${task.empleadoTexto}`} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-slate-400">
                        Fila {task.sourceRow}
                        {task.sourceDay ? ` · ${task.sourceDay}` : ''}
                        {task.sourceTime ? ` · ${task.sourceTime}` : ''}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{task.titulo}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {task.ubicacion} · {task.tipoTrabajo} · prioridad {task.prioridad}
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${task.empleadoId ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {task.empleadoNombre ?? 'Sin asignar'}
                    </div>
                  </div>
                  {task.warnings.length > 0 ? (
                    <div className="mt-2 text-xs font-medium text-amber-700">
                      {task.warnings.join(' · ')}
                    </div>
                  ) : null}
                </div>
              ))}
              {visibleTasks.length > 40 ? (
                <div className="px-4 py-3 text-sm text-slate-500">Vista previa limitada a 40 filas.</div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTasks([])
                  setSelectedDay('')
                  setSkippedRows(0)
                  setFileName(undefined)
                  setParseError(undefined)
                }}
              >
                Limpiar
              </Button>
              <Button type="button" onClick={handleImport} loading={isSubmitting}>
                Crear tareas
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'ok' | 'warn'
}) {
  const toneClass = tone === 'ok'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : tone === 'warn'
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : 'border-slate-100 bg-white text-slate-700'

  return (
    <div className={`rounded-[16px] border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

function parseScheduleMatrixRows(rows: unknown[][], empleados: EmployeeOption[]): ParseResult {
  const headerIndex = rows.findIndex((row) => normalizeText(cleanText(row[0])) === 'horario')
  if (headerIndex < 0) return { tasks: [], skippedRows: rows.length }

  const header = rows[headerIndex]
  const employeeColumns = header
    .map((value, index) => ({ index, label: cleanText(value) }))
    .filter((column) => column.index > 0 && column.label.length > 0)

  if (employeeColumns.length === 0) return { tasks: [], skippedRows: rows.length }

  const tasks: ImportedTaskPreview[] = []
  const orderByEmployee = new Map<string, number>()
  let currentDay = ''
  let skippedRows = headerIndex

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const sourceRow = headerIndex + offset + 2
    const firstCell = cleanText(row[0])
    if (!firstCell) {
      skippedRows += 1
      return
    }

    if (isDaySection(firstCell)) {
      currentDay = normalizeDayLabel(firstCell)
      return
    }

    if (!isTimeRange(firstCell)) {
      skippedRows += 1
      return
    }

    let parsedInRow = 0
    for (const column of employeeColumns) {
      const rawTask = cleanText(row[column.index])
      if (!rawTask || isRestCell(rawTask)) continue

      const empleado = matchEmployee(column.label, empleados)
      const warnings: string[] = []
      if (!empleado) warnings.push(`No coincide con empleados activos: ${column.label}`)

      const employeeKey = empleado?.id ? String(empleado.id) : column.label
      const nextOrder = (orderByEmployee.get(employeeKey) ?? 0) + 1
      orderByEmployee.set(employeeKey, nextOrder)

      const cleanTask = stripScheduleIcons(rawTask)
      tasks.push({
        sourceRow,
        sourceDay: currentDay || undefined,
        sourceTime: firstCell,
        tipoTrabajo: inferScheduleType(cleanTask),
        titulo: cleanTask,
        descripcion: [
          currentDay ? `Día: ${currentDay}` : '',
          `Horario: ${firstCell}`,
          `Responsable: ${column.label}`,
          `Tarea: ${cleanTask}`,
        ].filter(Boolean).join('\n'),
        ubicacion: inferScheduleLocation(cleanTask),
        prioridad: inferSchedulePriority(rawTask),
        empleadoId: empleado?.id,
        empleadoNombre: empleado?.nombre,
        empleadoTexto: column.label,
        ordenAsignacion: nextOrder,
        warnings,
      })
      parsedInRow += 1
    }

    if (parsedInRow === 0) skippedRows += 1
  })

  return { tasks, skippedRows }
}

function groupPdfTextRows(cells: PdfTextCell[]) {
  const sorted = [...cells].sort((left, right) => right.y - left.y || left.x - right.x)
  const rows: PdfTextCell[][] = []

  for (const cell of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - cell.y) <= 3)
    if (row) {
      row.push(cell)
    } else {
      rows.push([cell])
    }
  }

  return rows
    .map((row) => row.sort((left, right) => left.x - right.x))
    .sort((left, right) => right[0].y - left[0].y)
}

function detectPdfScheduleHeader(row: PdfTextCell[]) {
  const normalized = row.map((cell) => normalizeText(cell.text))
  const horarioIndex = normalized.findIndex((text) => text === 'horario')
  if (horarioIndex < 0) return null

  const scheduleHeaders = row
    .filter((cell, index) => index >= horarioIndex)
    .map((cell) => ({ label: cleanText(cell.text), x: cell.x }))
    .filter((cell) => cell.label.length > 0)

  if (scheduleHeaders.length < 2) return null
  return {
    labels: scheduleHeaders.map((cell) => cell.label),
    xs: scheduleHeaders.map((cell) => cell.x),
  }
}

function assignPdfCellsToColumns(row: PdfTextCell[], columnXs: number[]) {
  const output = Array(columnXs.length).fill('')
  const boundaries = columnXs.map((x, index) => {
    if (index === columnXs.length - 1) return Number.POSITIVE_INFINITY
    if (index === 0) {
      const firstColumnWidth = columnXs[1] - x
      return x + Math.min(55, Math.max(40, firstColumnWidth * 0.45))
    }
    return (x + columnXs[index + 1]) / 2
  })

  for (const cell of row) {
    const columnIndex = boundaries.findIndex((boundary) => cell.x < boundary)
    const safeIndex = columnIndex < 0 ? columnXs.length - 1 : columnIndex
    output[safeIndex] = [output[safeIndex], cell.text].filter(Boolean).join(' ')
  }

  return output.map((value) => value.trim())
}

function findGenericHeaderRow(rows: unknown[][]): [number, string[] | null] {
  const index = rows.findIndex((row) => row.some((cell) => {
    const normalized = normalizeText(cleanText(cell))
    return TITLE_ALIASES.map(normalizeText).includes(normalized) ||
      EMPLOYEE_ALIASES.map(normalizeText).includes(normalized)
  }))
  if (index < 0) return [-1, null]
  return [index, rows[index].map((cell) => cleanText(cell))]
}

function isDaySection(value: string) {
  const normalized = normalizeText(value)
  return WEEK_DAYS.some((day) => normalized.startsWith(normalizeText(day)))
}

function normalizeDayLabel(value: string) {
  const normalized = normalizeText(value)
  const day = WEEK_DAYS.find((candidate) => normalized.startsWith(normalizeText(candidate)))
  return day ?? value
}

function isTimeRange(value: string) {
  return /^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/.test(value.trim())
}

function isRestCell(value: string) {
  const normalized = normalizeText(value)
  return REST_VALUES.some((restValue) => normalized === restValue)
}

function stripScheduleIcons(value: string) {
  return value.replace(/[^\S\r\n]+/g, ' ').replace(/^🚨+\s*/u, '').trim()
}

function inferSchedulePriority(value: string): Priority {
  const normalized = normalizeText(value)
  if (value.includes('🚨') || normalized.includes('pre pico') || normalized.includes('fds')) return 'urgente'
  if (normalized.includes('sanitarios') || normalized.includes('profunda')) return 'alta'
  return 'media'
}

function inferScheduleType(value: string) {
  const normalized = normalizeText(value)
  if (normalized.includes('sanitarios')) return 'sanitarios'
  if (normalized.includes('vidrios')) return 'vidrios'
  if (normalized.includes('hidrolavado')) return 'hidrolavado'
  if (normalized.includes('residuos') || normalized.includes('cestos') || normalized.includes('contenedor')) return 'residuos'
  return 'limpieza_diaria'
}

function inferScheduleLocation(value: string) {
  const zoneMatch = value.match(/Zona\s+[A-E]/i)
  if (zoneMatch) return zoneMatch[0]
  const moduleMatch = value.match(/(?:m[oó]dulos?|edif|local(?:es)?)\s+[0-9][0-9\s/+\-a-zA-Z]*/)
  if (moduleMatch) return moduleMatch[0].trim()
  if (normalizeText(value).includes('sanitarios')) return 'Sanitarios'
  if (normalizeText(value).includes('deposito')) return 'Depósito'
  return 'Shopping'
}

function resolveDefaultDay(days: string[]) {
  if (days.length === 0) return ''
  const today = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  return days.includes(today) ? today : days[0]
}

function normalizeEntries(row: Record<string, unknown>): NormalizedEntry[] {
  return Object.entries(row).map(([key, value]) => ({
    key,
    normalized: normalizeText(key),
    value,
  }))
}

function getCell(entries: NormalizedEntry[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText)
  return entries.find((entry) => normalizedAliases.includes(entry.normalized))?.value
}

function getSlotCell(entries: NormalizedEntry[], bases: string[], slot: number) {
  const normalizedBases = bases.map(normalizeText)
  const candidates = normalizedBases.flatMap((base) => [`${base} ${slot}`, `${base}${slot}`])
  return entries.find((entry) => candidates.includes(entry.normalized))?.value
}

function getTaskSlots(entries: NormalizedEntry[]) {
  const slots = new Set<number>()
  for (const entry of entries) {
    const match = entry.normalized.match(/^(tarea|trabajo|actividad|titulo)\s*(\d+)$/)
    if (!match) continue
    if (!cleanText(entry.value)) continue
    slots.add(Number(match[2]))
  }
  return [...slots].sort((left, right) => left - right)
}

function normalizePriority(value: string): { priority: Priority; warning?: string } {
  const normalized = normalizeText(value)
  if (!normalized) return { priority: 'media', warning: 'Prioridad vacía, se usa media' }
  if (['baja', 'bajo', 'low'].includes(normalized)) return { priority: 'baja' }
  if (['media', 'medio', 'normal', 'mediana'].includes(normalized)) return { priority: 'media' }
  if (['alta', 'alto', 'high'].includes(normalized)) return { priority: 'alta' }
  if (['urgente', 'urgent', 'critica', 'critico'].includes(normalized)) return { priority: 'urgente' }
  return { priority: 'media', warning: `Prioridad no reconocida: ${value}` }
}

function matchEmployee(value: string, empleados: EmployeeOption[]) {
  const normalized = normalizeSearch(value)
  if (!normalized) return null

  const byId = /^\d+$/.test(normalized)
    ? empleados.find((empleado) => empleado.id === Number(normalized))
    : null
  if (byId) return byId

  const digits = value.replace(/\D/g, '')
  if (digits) {
    const byWhatsapp = empleados.find((empleado) => (empleado.waId ?? '').replace(/\D/g, '') === digits)
    if (byWhatsapp) return byWhatsapp
  }

  const exact = empleados.find((empleado) => normalizeSearch(empleado.nombre) === normalized)
  if (exact) return exact

  const candidates = empleados.filter((empleado) => {
    const employeeName = normalizeSearch(empleado.nombre)
    return employeeName.includes(normalized) || normalized.includes(employeeName)
  })
  return candidates.length === 1 ? candidates[0] : null
}

function parseOrder(value: unknown) {
  const text = cleanText(value)
  if (!text) return undefined
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : undefined
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearch(value: string) {
  return normalizeText(value).replace(/\s+/g, ' ')
}
