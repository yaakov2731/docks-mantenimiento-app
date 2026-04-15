import * as XLSX from 'xlsx'
import { attendanceActionLabel, attendanceChannelLabel, getAttendanceEventDateTime } from './attendancePresentation'

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSeconds(seconds?: number | null) {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function ratePeriodLabel(value?: string | null) {
  if (value === 'semana') return 'Semanal'
  if (value === 'quincena') return 'Quincenal'
  if (value === 'mes') return 'Mensual'
  return 'Diario'
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function exportarAsistenciaExcel({
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
  const wb = XLSX.utils.book_new()

  const resumenSheet = XLSX.utils.json_to_sheet([
    { Métrica: 'Período', Valor: periodo?.label ?? '' },
    { Métrica: 'Desde', Valor: periodo?.desde ?? '' },
    { Métrica: 'Hasta', Valor: periodo?.hasta ?? '' },
    { Métrica: 'Personal activo', Valor: resumenEquipo?.empleadosActivos ?? 0 },
    { Métrica: 'En servicio', Valor: resumenEquipo?.enTurno ?? 0 },
    { Métrica: 'Horas del período', Valor: formatSeconds(resumenEquipo?.horasPeriodoSegundos ?? 0) },
    { Métrica: 'Jornales liquidados', Valor: resumenEquipo?.diasLiquidados ?? 0 },
    { Métrica: 'Total a pagar', Valor: formatCurrency(resumenEquipo?.totalPagar ?? 0) },
    { Métrica: 'Liquidación cerrada', Valor: cierre?.cerrado ? 'Sí' : 'No' },
    { Métrica: 'Liquidación pagada', Valor: cierre?.pagado ? 'Sí' : 'No' },
    { Métrica: 'Cerrada por', Valor: cierre?.closedBy ?? '' },
    { Métrica: 'Fecha de cierre', Valor: formatDateTime(cierre?.closedAt) },
    { Métrica: 'Pagada por', Valor: cierre?.paidBy ?? '' },
    { Métrica: 'Fecha de pago', Valor: formatDateTime(cierre?.paidAt) },
  ])
  XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen')

  const empleadosSheet = XLSX.utils.json_to_sheet(
    empleados.map((empleado: any) => {
      const currentTurn = (empleado.turnos ?? []).find((turn: any) => turn.turnoAbierto) ?? null
      return ({
      Empleado: empleado.nombre,
      Especialidad: empleado.especialidad ?? '',
      'Pago diario': Number(empleado.pagoDiario ?? 0),
      'Pago diario (formato)': formatCurrency(empleado.pagoDiario ?? 0),
      'Pago semanal': Number(empleado.pagoSemanal ?? 0),
      'Pago semanal (formato)': formatCurrency(empleado.pagoSemanal ?? 0),
      'Pago quincenal': Number(empleado.pagoQuincenal ?? 0),
      'Pago quincenal (formato)': formatCurrency(empleado.pagoQuincenal ?? 0),
      'Pago mensual': Number(empleado.pagoMensual ?? 0),
      'Pago mensual (formato)': formatCurrency(empleado.pagoMensual ?? 0),
      'Tarifa aplicada': ratePeriodLabel(empleado.liquidacion?.tarifaPeriodo),
      'Monto tarifa aplicada': Number(empleado.liquidacion?.tarifaMonto ?? 0),
      'Monto tarifa aplicada (formato)': formatCurrency(empleado.liquidacion?.tarifaMonto ?? 0),
      'En turno': empleado.attendance?.onShift ? 'Sí' : 'No',
      'En almuerzo': empleado.attendance?.onLunch ? 'Sí' : 'No',
      'Ingreso turno actual': formatDateTime(currentTurn?.entradaAt ?? null),
      'Inicio almuerzo turno actual': formatDateTime(currentTurn?.inicioAlmuerzoAt ?? null),
      'Fin almuerzo turno actual': formatDateTime(currentTurn?.finAlmuerzoAt ?? null),
      'Salida turno actual': currentTurn?.turnoAbierto ? 'Turno abierto' : formatDateTime(currentTurn?.salidaAt ?? null),
      'Última acción': attendanceActionLabel(empleado.attendance?.lastAction),
      'Último canal': attendanceChannelLabel(empleado.attendance?.lastChannel),
      'Bruto turno actual': formatSeconds(empleado.attendance?.currentShiftGrossSeconds ?? 0),
      'Almuerzo turno actual': formatSeconds(empleado.attendance?.currentShiftLunchSeconds ?? 0),
      'Neto turno actual': formatSeconds(empleado.attendance?.currentShiftSeconds ?? 0),
      'Horas período': formatSeconds(empleado.liquidacion?.segundosTrabajados ?? 0),
      'Días liquidados': empleado.liquidacion?.diasTrabajados ?? 0,
      'Total a pagar': Number(empleado.liquidacion?.totalPagar ?? 0),
      'Total a pagar (formato)': formatCurrency(empleado.liquidacion?.totalPagar ?? 0),
      Cerrado: empleado.cierre ? 'Sí' : 'No',
      'Cerrado por': empleado.cierre?.cerradoPorNombre ?? '',
      'Fecha cierre': formatDateTime(empleado.cierre?.closedAt),
      Pagado: empleado.cierre?.pagadoAt ? 'Sí' : 'No',
      'Pagado por': empleado.cierre?.pagadoPorNombre ?? '',
      'Fecha pago': formatDateTime(empleado.cierre?.pagadoAt),
      'Tareas en curso': empleado.tareasEnCurso ?? 0,
      'Tareas pendientes': (empleado.tareasPendientes ?? 0) + (empleado.tareasPausadas ?? 0),
      'Asignaciones por confirmar': empleado.pendientesConfirmacion ?? 0,
    })})
  )
  XLSX.utils.book_append_sheet(wb, empleadosSheet, 'Liquidación')

  const diasSheet = XLSX.utils.json_to_sheet(
    empleados.flatMap((empleado: any) =>
      (empleado.liquidacion?.dias ?? []).map((dia: any) => ({
        Empleado: empleado.nombre,
        Fecha: dia.fecha,
        Etiqueta: dia.etiqueta,
        'Horas trabajadas': formatSeconds(dia.workedSeconds ?? 0),
        'Horas almuerzo': formatSeconds(dia.lunchSeconds ?? 0),
        Entradas: dia.entradas ?? 0,
        'Inicios almuerzo': dia.iniciosAlmuerzo ?? 0,
        'Fines almuerzo': dia.finesAlmuerzo ?? 0,
        Salidas: dia.salidas ?? 0,
        'Turno abierto': dia.turnoAbierto ? 'Sí' : 'No',
      }))
    )
  )
  XLSX.utils.book_append_sheet(wb, diasSheet, 'Detalle diario')

  const turnosSheet = XLSX.utils.json_to_sheet(
    empleados.flatMap((empleado: any) =>
      (empleado.turnos ?? []).map((turno: any, index: number) => ({
        Empleado: empleado.nombre,
        Fecha: formatDate(turno.entradaAt ?? null),
        'Turno #': index + 1,
        Entrada: formatDateTime(turno.entradaAt ?? null),
        'Inicio almuerzo': formatDateTime(turno.inicioAlmuerzoAt ?? null),
        'Fin almuerzo': formatDateTime(turno.finAlmuerzoAt ?? null),
        Salida: turno.turnoAbierto ? 'Turno abierto' : formatDateTime(turno.salidaAt ?? null),
        'Tiempo bruto': formatSeconds(turno.grossSeconds ?? 0),
        Almuerzo: formatSeconds(turno.lunchSeconds ?? 0),
        'Tiempo neto': formatSeconds(turno.workedSeconds ?? 0),
        'Canal entrada': attendanceChannelLabel(turno.entradaCanal),
        'Canal salida': attendanceChannelLabel(turno.salidaCanal),
        Estado: turno.turnoAbierto ? 'Abierto' : 'Cerrado',
      }))
    )
  )
  XLSX.utils.book_append_sheet(wb, turnosSheet, 'Turnos')

  const eventosSheet = XLSX.utils.json_to_sheet(
    eventos.map((evento: any) => ({
      Empleado: evento.empleadoNombre,
      Tipo: attendanceActionLabel(evento.tipo),
      Canal: attendanceChannelLabel(evento.canal),
      Fecha: formatDateTime(getAttendanceEventDateTime(evento)?.toString() ?? ''),
      Especialidad: evento.especialidad ?? '',
      Nota: evento.nota ?? '',
    }))
  )
  XLSX.utils.book_append_sheet(wb, eventosSheet, 'Movimientos')

  const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
  const periodoSlug = periodo?.tipo ?? 'periodo'
  XLSX.writeFile(wb, `Asistencia-Jornales-${periodoSlug}-${fecha}.xlsx`)
}
