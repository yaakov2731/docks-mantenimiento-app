import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { SECTORES_GASTRONOMIA } from '@shared/const'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export default function GastronomiaAsistencia() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sector, setSector] = useState<string>('todos')
  const [selectedCell, setSelectedCell] = useState<{ empId: number; day: number } | null>(null)

  const { data } = trpc.gastronomia.getMarcaciones.useQuery(
    { sector: sector === 'todos' ? undefined : sector, year, month },
    { enabled: true }
  )

  const employees = (data as any)?.employees ?? []
  const events = (data as any)?.events ?? []
  const daysInMonth = getDaysInMonth(year, month)

  function hasEntrada(empId: number, day: number): boolean {
    const date = new Date(year, month - 1, day)
    const key = getDateKey(date)
    return events.some((e: any) => {
      if (e.empleadoId !== empId || e.tipo !== 'entrada') return false
      const d = new Date(e.timestamp)
      return getDateKey(d) === key
    })
  }

  function getEventsForCell(empId: number, day: number) {
    const date = new Date(year, month - 1, day)
    const key = getDateKey(date)
    return events.filter((e: any) => {
      if (e.empleadoId !== empId) return false
      const d = new Date(e.timestamp)
      return getDateKey(d) === key
    })
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const selectedEvents = selectedCell ? getEventsForCell(selectedCell.empId, selectedCell.day) : []
  const selectedEmp = selectedCell ? employees.find((e: any) => e.id === selectedCell.empId) : null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Asistencia — Gastronomía</h1>

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

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-gray-50 border border-gray-200 font-medium text-gray-600 sticky left-0 z-10 min-w-[160px]">Empleado</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                <th key={day} className="px-2 py-2 bg-gray-50 border border-gray-200 font-medium text-gray-500 min-w-[32px] text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 border border-gray-200 font-medium text-gray-800 sticky left-0 bg-white z-10">
                  <div>{emp.nombre}</div>
                  {emp.puesto && <div className="text-gray-400 font-normal">{emp.puesto}</div>}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const present = hasEntrada(emp.id, day)
                  const isSelected = selectedCell?.empId === emp.id && selectedCell?.day === day
                  return (
                    <td
                      key={day}
                      onClick={() => setSelectedCell(present ? { empId: emp.id, day } : null)}
                      className={`border border-gray-200 text-center cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-100' :
                        present ? 'bg-green-50 hover:bg-green-100' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      {present ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={daysInMonth + 1} className="px-4 py-8 text-center text-gray-400">Sin empleados para este selector</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedCell && selectedEmp && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl max-w-sm">
          <h3 className="font-semibold text-gray-900 mb-2">
            {selectedEmp.nombre} — {selectedCell.day}/{month}/{year}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin registros</p>
          ) : (
            <ul className="space-y-1">
              {selectedEvents.map((e: any) => {
                const t = new Date(e.timestamp)
                const hora = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
                const labels: Record<string, string> = {
                  entrada: '📍 Entrada', salida: '🏁 Salida',
                  inicio_almuerzo: '🍽️ Inicio almuerzo', fin_almuerzo: '↩️ Fin almuerzo'
                }
                return (
                  <li key={e.id} className="text-sm text-gray-700">
                    {labels[e.tipo] ?? e.tipo}: <span className="font-medium">{hora}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <button onClick={() => setSelectedCell(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
        </div>
      )}
    </div>
  )
}
