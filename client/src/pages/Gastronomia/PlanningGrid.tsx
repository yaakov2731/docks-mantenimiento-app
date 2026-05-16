import { memo } from 'react'
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

function PlanningGridImpl({
  employees, weekDays, turnoByCell, draft,
  employeeMetricsById, onCellClick, onSetWeekWorkState,
}: Props) {
  return (
    <div className="gastro-plan-grid overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="gastro-plan-th sticky left-0 z-20 w-[200px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Empleado
            </th>
            {weekDays.map(day => {
              const label = formatDayLabel(day)
              return (
                <th key={day} className="gastro-plan-th min-w-[130px] border-l px-2 py-3 text-left">
                  <div className="text-[10px] uppercase tracking-wide">{label.short}</div>
                  <div className="text-xs font-semibold">{label.number}</div>
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
                <td className="gastro-plan-employee sticky left-0 z-10 border-t px-3 py-3">
                  <div className="text-sm font-semibold">{emp.nombre}</div>
                  <div className="mt-0.5 text-xs">{emp.puesto || 'Sin rol'}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(metrics?.rowCount ?? 0) > 0 && (
                      <span className="gastro-plan-mini-badge rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {metrics!.rowCount} cargados
                      </span>
                    )}
                    {(metrics?.pending ?? 0) > 0 && (
                      <span className="gastro-plan-mini-badge gastro-plan-mini-pending rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {metrics!.pending} pendientes
                      </span>
                    )}
                    {(metrics?.confirmed ?? 0) > 0 && (
                      <span className="gastro-plan-mini-badge gastro-plan-mini-confirmed rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {metrics!.confirmed} confirmados
                      </span>
                    )}
                    {(metrics?.draftCount ?? 0) > 0 && (
                      <span className="gastro-plan-mini-badge gastro-plan-mini-draft rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {metrics!.draftCount} sin guardar
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => onSetWeekWorkState(emp, true)}
                      className="gastro-plan-row-action gastro-plan-row-action-on rounded-lg border px-2 py-1 text-[10px] font-semibold"
                    >
                      Semana completa
                    </button>
                    <button
                      onClick={() => onSetWeekWorkState(emp, false)}
                      className="gastro-plan-row-action rounded-lg border px-2 py-1 text-[10px] font-semibold"
                    >
                      Limpiar
                    </button>
                  </div>
                  {!emp.waId && (
                    <div className="gastro-plan-mini-badge gastro-plan-mini-draft mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold">
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
                    <td key={day} className="gastro-plan-grid-cell border-l border-t px-1.5 py-2">
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

export const PlanningGrid = memo(PlanningGridImpl)
