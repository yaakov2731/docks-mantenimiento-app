import ExcelJS from 'exceljs'
import { attendanceActionLabel, attendanceChannelLabel, getAttendanceEventDateTime } from './attendancePresentation'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function fmtDateTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtSeconds(seconds?: number | null): string {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function ratePeriodLabel(value?: string | null) {
  if (value === 'semana') return 'Semanal'
  if (value === 'quincena') return 'Quincenal'
  if (value === 'mes') return 'Mensual'
  return 'Diario'
}

const DAY_MS = 24 * 60 * 60 * 1000

function getBaDateKey(ms: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms))
}

function getDayOfWeek(dateKey: string): number {
  // Parse YYYY-MM-DD as Argentina noon to get correct weekday
  const [y, mo, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, 12)).getDay() // 0=Sun, 6=Sat
}

function isWeekend(dateKey: string) {
  const dow = getDayOfWeek(dateKey)
  return dow === 0 || dow === 6
}

function getTodayKey() {
  return getBaDateKey(Date.now())
}

// ─── styles ─────────────────────────────────────────────────────────────────

const NAVY = { argb: 'FF0F2044' }
const NAVY_MID = { argb: 'FF1B3A6B' }
const WHITE = { argb: 'FFFFFFFF' }
const BLUE_PALE = { argb: 'FFE8F0FE' }
const GREEN_PALE = { argb: 'FFD1FAE5' }
const GREEN_TEXT = { argb: 'FF065F46' }
const GRAY_PALE = { argb: 'FFF3F4F6' }
const GRAY_WEEKEND = { argb: 'FFEEF0F3' }
const AMBER_PALE = { argb: 'FFFEF3C7' }
const YELLOW_TOTAL = { argb: 'FFFEF9C3' }
const BORDER_COLOR = { argb: 'FFD1D5DB' }
const BORDER_DARK = { argb: 'FF9CA3AF' }
const TODAY_BG = { argb: 'FFDBEAFE' }
const TODAY_TEXT = { argb: 'FF1D4ED8' }

function solidFill(color: { argb: string }): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: color }
}

function thinBorder(color = BORDER_COLOR): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color }
  return { top: side, bottom: side, left: side, right: side }
}

function mediumBorder(color = BORDER_DARK): Partial<ExcelJS.Borders> {
  const side = { style: 'medium' as const, color }
  return { top: side, bottom: side, left: side, right: side }
}

// ─── day headers ────────────────────────────────────────────────────────────

function buildDayHeaders(periodo: any): { key: string; line1: string; line2: string; weekend: boolean }[] {
  if (!periodo?.startMs || !periodo?.endMs) return []
  const headers = []
  for (let ms = periodo.startMs; ms < periodo.endMs; ms += DAY_MS) {
    const key = getBaDateKey(ms)
    const date = new Date(ms)
    const line1 = date.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).toUpperCase()
    const line2 = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
    headers.push({ key, line1, line2, weekend: isWeekend(key) })
  }
  return headers
}

// ─── calendar sheet ─────────────────────────────────────────────────────────

function addCalendarSheet(wb: ExcelJS.Workbook, periodo: any, empleados: any[]) {
  const ws = wb.addWorksheet('Calendario', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: '&C&B&14Docks del Puerto — Control de Asistencia',
      oddFooter: '&LGenerado: &D &T&R&P / &N',
    },
  })

  const days = buildDayHeaders(periodo)
  const todayKey = getTodayKey()

  // Total cols: 1 (employee) + days + 3 (total hs, días, monto)
  const firstDayCol = 2
  const totalHsCol = firstDayCol + days.length
  const diasCol = totalHsCol + 1
  const montoCol = diasCol + 1
  const lastCol = montoCol

  // ── column widths ──
  ws.getColumn(1).width = 22 // employee name
  for (let i = 0; i < days.length; i++) {
    ws.getColumn(firstDayCol + i).width = days.length > 20 ? 7.5 : days.length > 14 ? 9 : 11
  }
  ws.getColumn(totalHsCol).width = 10
  ws.getColumn(diasCol).width = 7
  ws.getColumn(montoCol).width = 14

  // ── row 1: main title ──
  ws.getRow(1).height = 36
  ws.mergeCells(1, 1, 1, lastCol)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = 'DOCKS DEL PUERTO  ·  CONTROL DE ASISTENCIA'
  titleCell.style = {
    font: { bold: true, size: 16, color: WHITE, name: 'Calibri' },
    fill: solidFill(NAVY),
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: mediumBorder(NAVY),
  }

  // ── row 2: period subtitle ──
  ws.getRow(2).height = 22
  // Left: period label + range
  ws.mergeCells(2, 1, 2, Math.ceil(lastCol / 2))
  const subtitleLeft = ws.getCell(2, 1)
  subtitleLeft.value = `${periodo?.label ?? ''} · ${periodo?.desde ?? ''} al ${periodo?.hasta ?? ''}`
  subtitleLeft.style = {
    font: { bold: true, size: 11, color: WHITE, name: 'Calibri' },
    fill: solidFill(NAVY_MID),
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  }
  // Right: generated date
  ws.mergeCells(2, Math.ceil(lastCol / 2) + 1, 2, lastCol)
  const subtitleRight = ws.getCell(2, Math.ceil(lastCol / 2) + 1)
  subtitleRight.value = `Generado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}`
  subtitleRight.style = {
    font: { size: 10, color: { argb: 'FFBFDBFE' }, name: 'Calibri' },
    fill: solidFill(NAVY_MID),
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  }

  // ── row 3: spacer ──
  ws.getRow(3).height = 6
  ws.mergeCells(3, 1, 3, lastCol)
  ws.getCell(3, 1).style = { fill: solidFill(NAVY) }

  // ── row 4: column headers ──
  ws.getRow(4).height = 34

  // "Empleado" header
  const empHeader = ws.getCell(4, 1)
  empHeader.value = 'EMPLEADO / ESPECIALIDAD'
  empHeader.style = {
    font: { bold: true, size: 9, color: WHITE, name: 'Calibri' },
    fill: solidFill(NAVY),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thinBorder({ argb: 'FF3B5280' }),
  }

  // Day headers
  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    const col = firstDayCol + i
    const cell = ws.getCell(4, col)
    const isToday = day.key === todayKey
    cell.value = `${day.line1}\n${day.line2}`
    cell.style = {
      font: {
        bold: true, size: day.weekend ? 8 : 9,
        color: isToday ? TODAY_TEXT : day.weekend ? { argb: 'FF9CA3AF' } : { argb: 'FF1E40AF' },
        name: 'Calibri',
      },
      fill: solidFill(isToday ? TODAY_BG : day.weekend ? GRAY_WEEKEND : BLUE_PALE),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinBorder(BORDER_COLOR),
    }
  }

  // Total headers
  const totalHsHeader = ws.getCell(4, totalHsCol)
  totalHsHeader.value = 'TOTAL\nHORAS'
  totalHsHeader.style = {
    font: { bold: true, size: 9, color: { argb: 'FF713F12' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FFFDE68A' }),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thinBorder(BORDER_COLOR),
  }

  const diasHeader = ws.getCell(4, diasCol)
  diasHeader.value = 'DÍAS'
  diasHeader.style = {
    font: { bold: true, size: 9, color: { argb: 'FF713F12' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FFFDE68A' }),
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: thinBorder(BORDER_COLOR),
  }

  const montoHeader = ws.getCell(4, montoCol)
  montoHeader.value = 'MONTO\nA PAGAR'
  montoHeader.style = {
    font: { bold: true, size: 9, color: { argb: 'FF713F12' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FFFDE68A' }),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thinBorder(BORDER_COLOR),
  }

  // ── employee rows ──
  let dataRow = 5
  for (const emp of empleados) {
    const dailyMap = new Map((emp.liquidacion?.dias ?? []).map((d: any) => [d.fecha, d]))
    const row = ws.getRow(dataRow)
    row.height = 26

    // Employee name cell
    const nameCell = ws.getCell(dataRow, 1)
    nameCell.value = `${emp.nombre}${emp.especialidad ? `\n${emp.especialidad}` : ''}`
    const isClosed = !!emp.cierre
    nameCell.style = {
      font: { bold: true, size: 10, color: { argb: 'FF111827' }, name: 'Calibri' },
      fill: solidFill(isClosed ? { argb: 'FFF0FDF4' } : { argb: 'FFFAFAFA' }),
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 },
      border: thinBorder(BORDER_COLOR),
    }

    // Day cells
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const col = firstDayCol + i
      const dayData = dailyMap.get(day.key)
      const cell = ws.getCell(dataRow, col)
      const isToday = day.key === todayKey

      if (dayData && dayData.workedSeconds > 0) {
        cell.value = fmtSeconds(dayData.workedSeconds)
        cell.style = {
          font: { size: 9, bold: true, color: GREEN_TEXT, name: 'Calibri' },
          fill: solidFill(isToday ? { argb: 'FFBBF7D0' } : GREEN_PALE),
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: thinBorder(BORDER_COLOR),
        }
      } else if (dayData && (dayData.entradas > 0 || dayData.salidas > 0)) {
        // Has events but no computed hours (open shift or anomaly)
        cell.value = 'Registro'
        cell.style = {
          font: { size: 8, italic: true, color: { argb: 'FFD97706' }, name: 'Calibri' },
          fill: solidFill(AMBER_PALE),
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: thinBorder(BORDER_COLOR),
        }
      } else {
        cell.value = ''
        cell.style = {
          fill: solidFill(day.weekend ? GRAY_WEEKEND : { argb: 'FFFFFFFF' }),
          border: thinBorder(BORDER_COLOR),
        }
      }
    }

    // Total horas
    const totalCell = ws.getCell(dataRow, totalHsCol)
    totalCell.value = fmtSeconds(emp.liquidacion?.segundosTrabajados ?? 0)
    totalCell.style = {
      font: { bold: true, size: 10, color: { argb: 'FF78350F' }, name: 'Calibri' },
      fill: solidFill(YELLOW_TOTAL),
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder(BORDER_COLOR),
    }

    // Días
    const diasCell = ws.getCell(dataRow, diasCol)
    diasCell.value = emp.liquidacion?.diasTrabajados ?? 0
    diasCell.style = {
      font: { bold: true, size: 10, color: { argb: 'FF78350F' }, name: 'Calibri' },
      fill: solidFill(YELLOW_TOTAL),
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder(BORDER_COLOR),
    }

    // Monto
    const montoCell = ws.getCell(dataRow, montoCol)
    montoCell.value = Number(emp.liquidacion?.totalPagar ?? 0)
    montoCell.numFmt = '"$"#,##0'
    montoCell.style = {
      font: { bold: true, size: 10, color: { argb: 'FF166534' }, name: 'Calibri' },
      fill: solidFill(isClosed ? { argb: 'FFD1FAE5' } : YELLOW_TOTAL),
      alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
      border: thinBorder(BORDER_COLOR),
    }

    dataRow++
  }

  // ── totals row ──
  const totRow = ws.getRow(dataRow)
  totRow.height = 28

  const totLabel = ws.getCell(dataRow, 1)
  totLabel.value = 'TOTAL EQUIPO'
  totLabel.style = {
    font: { bold: true, size: 10, color: WHITE, name: 'Calibri' },
    fill: solidFill(NAVY),
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: mediumBorder({ argb: 'FF3B5280' }),
  }

  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    const col = firstDayCol + i
    const totalSecs = empleados.reduce((sum, emp) => {
      const dm = new Map((emp.liquidacion?.dias ?? []).map((d: any) => [d.fecha, d]))
      return sum + ((dm.get(day.key) as any)?.workedSeconds ?? 0)
    }, 0)
    const cell = ws.getCell(dataRow, col)
    cell.value = totalSecs > 0 ? fmtSeconds(totalSecs) : ''
    cell.style = {
      font: { bold: true, size: 9, color: totalSecs > 0 ? GREEN_TEXT : { argb: 'FF9CA3AF' }, name: 'Calibri' },
      fill: solidFill(totalSecs > 0 ? { argb: 'FF6EE7B7' } : day.weekend ? GRAY_WEEKEND : { argb: 'FFE5E7EB' }),
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: mediumBorder({ argb: 'FF3B5280' }),
    }
  }

  // Total hs (sum all employees)
  const grandTotalSecs = empleados.reduce((sum, emp) => sum + (emp.liquidacion?.segundosTrabajados ?? 0), 0)
  const grandTotalCell = ws.getCell(dataRow, totalHsCol)
  grandTotalCell.value = fmtSeconds(grandTotalSecs)
  grandTotalCell.style = {
    font: { bold: true, size: 11, color: { argb: 'FF78350F' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FFFBBF24' }),
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: mediumBorder({ argb: 'FFB45309' }),
  }

  const grandDias = empleados.reduce((sum, emp) => sum + (emp.liquidacion?.diasTrabajados ?? 0), 0)
  const grandDiasCell = ws.getCell(dataRow, diasCol)
  grandDiasCell.value = grandDias
  grandDiasCell.style = {
    font: { bold: true, size: 11, color: { argb: 'FF78350F' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FFFBBF24' }),
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: mediumBorder({ argb: 'FFB45309' }),
  }

  const grandMonto = empleados.reduce((sum, emp) => sum + Number(emp.liquidacion?.totalPagar ?? 0), 0)
  const grandMontoCell = ws.getCell(dataRow, montoCol)
  grandMontoCell.value = grandMonto
  grandMontoCell.numFmt = '"$"#,##0'
  grandMontoCell.style = {
    font: { bold: true, size: 11, color: { argb: 'FF14532D' }, name: 'Calibri' },
    fill: solidFill({ argb: 'FF4ADE80' }),
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
    border: mediumBorder({ argb: 'FF15803D' }),
  }

  // ── freeze panes: lock first col + first 4 rows ──
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 4 }]
}

// ─── resumen sheet ──────────────────────────────────────────────────────────

function addResumenSheet(wb: ExcelJS.Workbook, periodo: any, resumenEquipo: any, cierre: any) {
  const ws = wb.addWorksheet('Resumen')
  ws.columns = [
    { header: 'Métrica', key: 'k', width: 28 },
    { header: 'Valor', key: 'v', width: 32 },
  ]

  // Style header row
  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: WHITE, name: 'Calibri' }
  hdr.fill = solidFill(NAVY) as any
  hdr.height = 20

  const rows = [
    ['Período', periodo?.label ?? ''],
    ['Desde', periodo?.desde ?? ''],
    ['Hasta', periodo?.hasta ?? ''],
    ['Personal activo', resumenEquipo?.empleadosActivos ?? 0],
    ['En servicio', resumenEquipo?.enTurno ?? 0],
    ['Horas del período', fmtSeconds(resumenEquipo?.horasPeriodoSegundos ?? 0)],
    ['Jornales liquidados', resumenEquipo?.diasLiquidados ?? 0],
    ['Total a pagar', fmtCurrency(resumenEquipo?.totalPagar ?? 0)],
    ['Liquidación cerrada', cierre?.cerrado ? 'Sí' : 'No'],
    ['Liquidación pagada', cierre?.pagado ? 'Sí' : 'No'],
    ['Cerrada por', cierre?.closedBy ?? ''],
    ['Fecha de cierre', fmtDateTime(cierre?.closedAt)],
    ['Pagada por', cierre?.paidBy ?? ''],
    ['Fecha de pago', fmtDateTime(cierre?.paidAt)],
  ]

  rows.forEach(([k, v], idx) => {
    const r = ws.addRow({ k, v })
    r.height = 18
    const fill = solidFill(idx % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' }) as any
    r.eachCell(cell => {
      cell.fill = fill
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = thinBorder() as any
    })
  })
}

// ─── liquidación sheet ──────────────────────────────────────────────────────

function addLiquidacionSheet(wb: ExcelJS.Workbook, empleados: any[]) {
  const ws = wb.addWorksheet('Liquidación')
  ws.columns = [
    { header: 'Empleado', key: 'nombre', width: 22 },
    { header: 'Especialidad', key: 'esp', width: 18 },
    { header: 'Tarifa aplicada', key: 'tarifa', width: 16 },
    { header: 'Monto tarifa', key: 'monto_tarifa', width: 14 },
    { header: 'Horas período', key: 'horas', width: 13 },
    { header: 'Días liq.', key: 'dias', width: 10 },
    { header: 'Total a pagar', key: 'total', width: 15 },
    { header: 'Cerrado', key: 'cerrado', width: 10 },
    { header: 'Cerrado por', key: 'cer_por', width: 18 },
    { header: 'Fecha cierre', key: 'fecha_cie', width: 16 },
    { header: 'Pagado', key: 'pagado', width: 10 },
    { header: 'Pagado por', key: 'pag_por', width: 18 },
    { header: 'Fecha pago', key: 'fecha_pag', width: 16 },
  ]

  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: WHITE, name: 'Calibri', size: 10 }
  hdr.fill = solidFill(NAVY) as any
  hdr.height = 22
  hdr.alignment = { horizontal: 'center', vertical: 'middle' } as any

  empleados.forEach((emp: any, idx: number) => {
    const r = ws.addRow({
      nombre: emp.nombre,
      esp: emp.especialidad ?? '',
      tarifa: ratePeriodLabel(emp.liquidacion?.tarifaPeriodo),
      monto_tarifa: Number(emp.liquidacion?.tarifaMonto ?? 0),
      horas: fmtSeconds(emp.liquidacion?.segundosTrabajados ?? 0),
      dias: emp.liquidacion?.diasTrabajados ?? 0,
      total: Number(emp.liquidacion?.totalPagar ?? 0),
      cerrado: emp.cierre ? 'Sí' : 'No',
      cer_por: emp.cierre?.cerradoPorNombre ?? '',
      fecha_cie: fmtDateTime(emp.cierre?.closedAt),
      pagado: emp.cierre?.pagadoAt ? 'Sí' : 'No',
      pag_por: emp.cierre?.pagadoPorNombre ?? '',
      fecha_pag: fmtDateTime(emp.cierre?.pagadoAt),
    })
    r.height = 18
    r.getCell('monto_tarifa').numFmt = '"$"#,##0'
    r.getCell('total').numFmt = '"$"#,##0'
    const fill = solidFill(idx % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' }) as any
    r.eachCell(cell => {
      cell.fill = fill
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = thinBorder() as any
      cell.alignment = { vertical: 'middle' }
    })
  })
}

// ─── detalle diario sheet ───────────────────────────────────────────────────

function addDetalleDiarioSheet(wb: ExcelJS.Workbook, empleados: any[]) {
  const ws = wb.addWorksheet('Detalle diario')
  ws.columns = [
    { header: 'Empleado', key: 'nombre', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Etiqueta', key: 'etiqueta', width: 14 },
    { header: 'Horas trabajadas', key: 'horas', width: 16 },
    { header: 'Horas almuerzo', key: 'almuerzo', width: 15 },
    { header: 'Entradas', key: 'entradas', width: 10 },
    { header: 'Ini. almuerzo', key: 'ini_alm', width: 13 },
    { header: 'Fin almuerzo', key: 'fin_alm', width: 13 },
    { header: 'Salidas', key: 'salidas', width: 10 },
    { header: 'Turno abierto', key: 'abierto', width: 13 },
  ]

  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: WHITE, name: 'Calibri', size: 10 }
  hdr.fill = solidFill(NAVY) as any
  hdr.height = 22

  let rowIdx = 0
  for (const emp of empleados) {
    for (const dia of (emp.liquidacion?.dias ?? [])) {
      const r = ws.addRow({
        nombre: emp.nombre,
        fecha: dia.fecha,
        etiqueta: dia.etiqueta,
        horas: fmtSeconds(dia.workedSeconds ?? 0),
        almuerzo: fmtSeconds(dia.lunchSeconds ?? 0),
        entradas: dia.entradas ?? 0,
        ini_alm: dia.iniciosAlmuerzo ?? 0,
        fin_alm: dia.finesAlmuerzo ?? 0,
        salidas: dia.salidas ?? 0,
        abierto: dia.turnoAbierto ? 'Sí' : 'No',
      })
      r.height = 16
      const fill = solidFill(rowIdx % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' }) as any
      r.eachCell(cell => {
        cell.fill = fill
        cell.font = { name: 'Calibri', size: 10 }
        cell.border = thinBorder() as any
        cell.alignment = { vertical: 'middle' }
      })
      rowIdx++
    }
  }
}

// ─── turnos sheet ───────────────────────────────────────────────────────────

function addTurnosSheet(wb: ExcelJS.Workbook, empleados: any[]) {
  const ws = wb.addWorksheet('Turnos')
  ws.columns = [
    { header: 'Empleado', key: 'nombre', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Turno #', key: 'num', width: 9 },
    { header: 'Entrada', key: 'entrada', width: 16 },
    { header: 'Ini. almuerzo', key: 'ini_alm', width: 16 },
    { header: 'Fin almuerzo', key: 'fin_alm', width: 16 },
    { header: 'Salida', key: 'salida', width: 16 },
    { header: 'Tiempo bruto', key: 'bruto', width: 13 },
    { header: 'Almuerzo', key: 'almuerzo', width: 11 },
    { header: 'Tiempo neto', key: 'neto', width: 13 },
    { header: 'Canal entrada', key: 'canal_e', width: 14 },
    { header: 'Canal salida', key: 'canal_s', width: 14 },
    { header: 'Estado', key: 'estado', width: 10 },
  ]

  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: WHITE, name: 'Calibri', size: 10 }
  hdr.fill = solidFill(NAVY) as any
  hdr.height = 22

  let rowIdx = 0
  for (const emp of empleados) {
    (emp.turnos ?? []).forEach((turno: any, index: number) => {
      const r = ws.addRow({
        nombre: emp.nombre,
        fecha: fmtDate(turno.entradaAt ?? null),
        num: index + 1,
        entrada: fmtDateTime(turno.entradaAt ?? null),
        ini_alm: fmtDateTime(turno.inicioAlmuerzoAt ?? null),
        fin_alm: fmtDateTime(turno.finAlmuerzoAt ?? null),
        salida: turno.turnoAbierto ? 'Turno abierto' : fmtDateTime(turno.salidaAt ?? null),
        bruto: fmtSeconds(turno.grossSeconds ?? 0),
        almuerzo: fmtSeconds(turno.lunchSeconds ?? 0),
        neto: fmtSeconds(turno.workedSeconds ?? 0),
        canal_e: attendanceChannelLabel(turno.entradaCanal),
        canal_s: attendanceChannelLabel(turno.salidaCanal),
        estado: turno.turnoAbierto ? 'Abierto' : 'Cerrado',
      })
      r.height = 16
      const isOpen = !!turno.turnoAbierto
      const fill = solidFill(
        isOpen ? { argb: 'FFECFDF5' } : rowIdx % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' }
      ) as any
      r.eachCell(cell => {
        cell.fill = fill
        cell.font = { name: 'Calibri', size: 10 }
        cell.border = thinBorder() as any
        cell.alignment = { vertical: 'middle' }
      })
      rowIdx++
    })
  }
}

// ─── movimientos sheet ──────────────────────────────────────────────────────

function addMovimientosSheet(wb: ExcelJS.Workbook, eventos: any[]) {
  const ws = wb.addWorksheet('Movimientos')
  ws.columns = [
    { header: 'Empleado', key: 'nombre', width: 22 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Canal', key: 'canal', width: 16 },
    { header: 'Fecha y hora', key: 'fecha', width: 18 },
    { header: 'Especialidad', key: 'esp', width: 18 },
    { header: 'Nota', key: 'nota', width: 30 },
  ]

  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: WHITE, name: 'Calibri', size: 10 }
  hdr.fill = solidFill(NAVY) as any
  hdr.height = 22

  eventos.forEach((evento: any, idx: number) => {
    const r = ws.addRow({
      nombre: evento.empleadoNombre,
      tipo: attendanceActionLabel(evento.tipo),
      canal: attendanceChannelLabel(evento.canal),
      fecha: fmtDateTime(getAttendanceEventDateTime(evento)?.toString() ?? ''),
      esp: evento.especialidad ?? '',
      nota: evento.nota ?? '',
    })
    r.height = 16
    const fill = solidFill(idx % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' }) as any
    r.eachCell(cell => {
      cell.fill = fill
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = thinBorder() as any
      cell.alignment = { vertical: 'middle' }
    })
  })
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function exportarAsistenciaExcel({
  periodo,
  empleados,
  eventos,
  resumenEquipo,
  cierre,
}: {
  periodo: any
  empleados: any[]
  eventos: any[]
  resumenEquipo: any
  cierre?: any
}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Docks del Puerto'
  wb.created = new Date()

  addCalendarSheet(wb, periodo, empleados)
  addResumenSheet(wb, periodo, resumenEquipo, cierre)
  addLiquidacionSheet(wb, empleados)
  addDetalleDiarioSheet(wb, empleados)
  addTurnosSheet(wb, empleados)
  addMovimientosSheet(wb, eventos)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
  a.href = url
  a.download = `Asistencia-Jornales-${periodo?.tipo ?? 'periodo'}-${fecha}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
