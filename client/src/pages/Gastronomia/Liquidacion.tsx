import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function GastronomiaLiquidacion() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sector, setSector] = useState<string>('todos')

  const { data: rows = [] } = trpc.gastronomia.getLiquidacion.useQuery(
    { sector: sector === 'todos' ? undefined : sector, year, month }
  )

  const total = (rows as any[]).reduce((sum: number, r: any) => sum + (r.total ?? 0), 0)

  const getSectorLabel = (val: string) => SECTORES_GASTRONOMIA.find(s => s.value === val)?.label ?? val

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Liquidación — Gastronomía</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-lg font-bold">‹</button>
          <span className="font-medium text-gray-700 min-w-[140px] text-center">{MESES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-lg font-bold">›</button>
        </div>
        <select value={sector} onChange={e => setSector(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="todos">Todos los locales</option>
          {SECTORES_GASTRONOMIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Empleado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Local</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Puesto</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Días</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Valor día</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(rows as any[]).map((row: any) => (
              <tr key={row.empleado.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.empleado.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{getSectorLabel(row.empleado.sector)}</td>
                <td className="px-4 py-3 text-gray-600">{row.empleado.puesto ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{row.diasTrabajados}</td>
                <td className="px-4 py-3 text-right text-gray-600">${row.valorDia?.toLocaleString('es-AR') ?? 0}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">${row.total?.toLocaleString('es-AR') ?? 0}</td>
              </tr>
            ))}
            {(rows as any[]).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin datos para este período</td></tr>
            )}
          </tbody>
          {(rows as any[]).length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 font-semibold text-gray-700 text-right">Total del período</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">${total.toLocaleString('es-AR')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Los datos de asistencia se sincronizan automáticamente con Google Sheets (hoja Planificación).
      </p>
    </div>
  )
}
