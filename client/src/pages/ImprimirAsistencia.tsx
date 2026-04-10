import { useSearch } from 'wouter'
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
import WorkingTime from '../components/WorkingTime'
import { attendanceChannelLabel, getAttendanceEventDateTime } from '../lib/attendancePresentation'
import { Printer } from 'lucide-react'

type Periodo = 'dia' | 'semana' | 'quincena' | 'mes'

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ratePeriodLabel(value?: string | null) {
  if (value === 'semana') return 'Semanal'
  if (value === 'quincena') return 'Quincenal'
  if (value === 'mes') return 'Mensual'
  return 'Diario'
}

export default function ImprimirAsistencia() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const periodo = (params.get('periodo') as Periodo) || 'semana'
  const empleadoIdParam = params.get('empleadoId')
  const empleadoId = empleadoIdParam ? Number(empleadoIdParam) : undefined
  const { data, isLoading } = trpc.asistencia.resumen.useQuery({ periodo, empleadoId })

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando liquidación...</div>
  if (!data) return <div className="p-8 text-center text-gray-500">No se pudo cargar la liquidación.</div>

  const empleados = data.empleados ?? []
  const resumen = data.resumenEquipo ?? {}
  const periodoInfo = data.periodo
  const cierre = data.cierre

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="no-print flex justify-center mb-4">
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="print-area bg-white max-w-5xl mx-auto shadow-lg">
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-heading font-bold text-xl">D</div>
            <div>
              <div className="font-heading font-bold text-lg text-sidebar-bg">Docks del Puerto</div>
              <div className="text-xs text-gray-500">Liquidación de asistencia y jornales</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider">{periodoInfo?.label ?? 'Período'}</div>
            <div className="font-heading font-bold text-xl text-primary">{periodoInfo?.desde} a {periodoInfo?.hasta}</div>
            {empleadoId && empleados[0] && (
              <div className="text-xs text-gray-500 mt-1">Empleado: {empleados[0].nombre}</div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Personal activo', value: resumen.empleadosActivos ?? 0 },
                { label: 'En servicio', value: resumen.enTurno ?? 0 },
                { label: 'Jornales liquidados', value: resumen.diasLiquidados ?? 0 },
                { label: 'Total a pagar', value: formatCurrency(resumen.totalPagar ?? 0) },
              ].map(card => (
              <div key={card.label} className="border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-400 uppercase mb-1">{card.label}</div>
                <div className="font-heading font-semibold text-lg">{card.value}</div>
              </div>
            ))}
          </div>

          {cierre?.cerrado && (
            <div className={`border rounded-lg px-4 py-3 text-sm ${cierre.pagado ? 'border-cyan-200 bg-cyan-50 text-cyan-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
              Liquidación {cierre.pagado ? 'pagada' : 'cerrada'}
              {cierre.closedBy ? ` por ${cierre.closedBy}` : ''}{cierre.closedAt ? ` el ${formatDateTime(cierre.closedAt)}` : ''}.
              {cierre.pagadoAt ? ` Pagada el ${formatDateTime(cierre.pagadoAt)}` : ''}{cierre.paidBy ? ` por ${cierre.paidBy}` : ''}.
            </div>
          )}

          <div>
            <div className="text-xs text-gray-400 uppercase font-medium mb-3">Liquidación por empleado</div>
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Empleado', 'Especialidad', 'Tarifa aplicada', 'Ingreso', 'Salida', 'Horas', 'Días', 'Total', 'Estado'].map(header => (
                    <th key={header} className="px-3 py-2 text-left border-b border-gray-200 font-medium text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empleados.map((empleado: any) => (
                  <tr key={empleado.empleadoId} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">{empleado.nombre}</td>
                    <td className="px-3 py-2">{empleado.especialidad || 'General'}</td>
                    <td className="px-3 py-2">
                      {formatCurrency(empleado.liquidacion?.tarifaMonto ?? 0)} · {ratePeriodLabel(empleado.liquidacion?.tarifaPeriodo)}
                    </td>
                    <td className="px-3 py-2">{formatDateTime(empleado.hoy?.primerIngresoAt)}</td>
                    <td className="px-3 py-2">{empleado.attendance?.onShift ? 'Turno abierto' : formatDateTime(empleado.hoy?.ultimaSalidaAt)}</td>
                    <td className="px-3 py-2"><WorkingTime seconds={empleado.liquidacion?.segundosTrabajados ?? 0} /></td>
                    <td className="px-3 py-2">{empleado.liquidacion?.diasTrabajados ?? 0}</td>
                    <td className="px-3 py-2 font-semibold">{formatCurrency(empleado.liquidacion?.totalPagar ?? 0)}</td>
                    <td className="px-3 py-2">
                      {empleado.cierre?.pagadoAt ? 'Pagado' : empleado.cierre ? 'Cerrado' : 'Abierto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase font-medium mb-3">Movimientos recientes</div>
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Empleado', 'Tipo', 'Canal', 'Fecha', 'Nota'].map(header => (
                    <th key={header} className="px-3 py-2 text-left border-b border-gray-200 font-medium text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.eventos ?? []).slice(0, 20).map((evento: any) => (
                  <tr key={evento.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">{evento.empleadoNombre}</td>
                    <td className="px-3 py-2 capitalize">{evento.tipo}</td>
                    <td className="px-3 py-2">{attendanceChannelLabel(evento.canal)}</td>
                    <td className="px-3 py-2">{formatDateTime(getAttendanceEventDateTime(evento)?.toString() ?? null)}</td>
                    <td className="px-3 py-2">{evento.nota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-4">Responsable administrativo</div>
              <div className="border-b border-gray-400 pb-1 mb-1">&nbsp;</div>
              <div className="text-xs text-gray-400">Firma y aclaración</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase mb-4">Observaciones</div>
              <div className="border rounded-lg border-gray-300 h-20" />
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-sidebar-bg text-white/60 text-xs flex justify-between">
          <span>Docks del Puerto — Panel de asistencia y jornales</span>
          <span>{periodoInfo?.label ?? 'Período'} · {periodoInfo?.desde} a {periodoInfo?.hasta}</span>
        </div>
      </div>
    </div>
  )
}
