import { draftKey, formatDayLabel, type DraftTurno } from './types'
import { PlanningCell } from './PlanningCell'

type Employee = {
  id: number
  nombre: string
  puesto?: string
  waId?: string
}

type EmployeeMetrics = {
  rowCount: number
  pending: number
  confirmed: number
  draftCount: number
}

type Props = {
  employees: Employee[]
  weekDays: string[]
  turnoByCell: Map<string, any>
  draft: Record<string, DraftTurno>
  employeeMetricsById: Map<number, EmployeeMetrics>
  onCellClick: (emp: Employee, fecha: string) => void
  onSetWeekWorkState: (emp: Employee, trabaja: boolean) => void
}

export function PlanningGrid({
  employees, weekDays, turnoByCell, draft,
  employeeMetricsById, onCellClick, onSetWeekWorkState,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-20 w-[200px] bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Empleado
            </th>
            {weekDays.map(day => {
              const label = formatDayLabel(day)
              return (
                <th key={day} className="min-w-[130px] border-l border-slate-100 bg-slate-50 px-2 py-3 text-left">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{label.short}</div>
                  <div className="text-xs font-semibold text-slate-700">{label.number}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const metrics = employeeMetricsById.get(emp.id)
            return (
              <tr key={emp.id} className="align-top">
                <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{emp.nombre}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{emp.puesto || 'Sin rol'}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(metrics?.rowCount ?? 0) > 0 && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {metrics!.rowCount} cargados
                      </span>
                    )}
                    {(metrics?.pending ?? 0) > 0 && (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                        {metrics!.pending} pendientes
                      </span>
                    )}
                    {(metrics?.confirmed ?? 0) > 0 && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {metrics!.confirmed} confirmados
                      </span>
                    )}
                    {(metrics?.draftCount ?? 0) > 0 && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {metrics!.draftCount} sin guardar
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => onSetWeekWorkState(emp, true)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Semana completa
                    </button>
                    <button
                      onClick={() => onSetWeekWorkState(emp, false)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                    >
                      Limpiar
                    </button>
                  </div>
                  {!emp.waId && (
                    <div className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Sin WA
                    </div>
                  )}
                </td>
                {weekDays.map(day => {
                  const key = draftKey(emp.id, day)
                  const savedTurno = turnoByCell.get(key)
                  const cellDraft = draft[key]
                  const isDraft = Object.prototype.hasOwnProperty.call(draft, key)
                  return (
                    <td key={day} className="border-l border-t border-slate-100 px-1.5 py-2">
                      <PlanningCell
                        savedTurno={savedTurno}
                        draft={cellDraft}
                        isDraft={isDraft}
                        onClick={() => onCellClick(emp, day)}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {employees.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                Sin empleados activos para este local.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
