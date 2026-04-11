import { useState } from 'react'
import { RONDAS_ESTADOS } from '../../../../shared/const'

type RoundsTimelineProps = {
  items: any[]
  employees?: Array<{ id: number; nombre: string }>
  onAssign?: (input: { occurrenceId: number; empleadoId: number }) => Promise<void> | void
  onRelease?: (input: { occurrenceId: number }) => Promise<void> | void
  busyOccurrenceId?: number | null
}

export function RoundsTimeline({
  items,
  employees = [],
  onAssign,
  onRelease,
  busyOccurrenceId = null,
}: RoundsTimelineProps) {
  const [selectedByOccurrence, setSelectedByOccurrence] = useState<Record<number, string>>({})

  return (
    <div className="surface-panel rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Secuencia del día</div>
          <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Timeline operativo</h3>
          <p className="mt-2 text-sm text-slate-500">Lectura cronológica de los controles, observaciones y desvíos del turno.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No hay rondas programadas para esta fecha operativa.
          </div>
        ) : (
          items.map((item) => {
            const tone = RONDAS_ESTADOS.find((state) => state.value === item.estado) ?? RONDAS_ESTADOS[0]
            const currentOwner = item.responsableActualNombre ?? item.empleadoNombre ?? 'Sin responsable'
            const programmedOwner = item.responsableProgramadoNombre ?? item.empleadoNombre ?? null
            const showProgrammed = programmedOwner && programmedOwner !== currentOwner
            const assignmentState = item.asignacionEstado ?? 'asignada'
            const selectedEmployeeId = selectedByOccurrence[item.id] ?? String(item.responsableActualId ?? '')
            const isBusy = busyOccurrenceId === item.id

            return (
              <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[88px_1fr_auto] md:items-center">
                  <div className="font-heading text-[26px] leading-none font-semibold text-sidebar-bg">
                    {item.programadoAtLabel ?? '--:--'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.nombreRonda ?? 'Ronda operativa'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {currentOwner}
                      {showProgrammed ? ` · Programada: ${programmedOwner}` : ''}
                      {assignmentState ? ` · ${assignmentState}` : ''}
                      {item.canalConfirmacion ? ` · ${item.canalConfirmacion}` : ''}
                      {item.escaladoAt ? ' · Escalado' : ''}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      {item.inicioRealAt ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Inicio {formatClockLabel(item.inicioRealAt)}
                        </span>
                      ) : null}
                      {item.pausadoAt ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Pausa {formatClockLabel(item.pausadoAt)}
                        </span>
                      ) : null}
                      {item.finRealAt ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Fin {formatClockLabel(item.finRealAt)}
                        </span>
                      ) : null}
                      {typeof item.tiempoAcumuladoSegundos === 'number' ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Duración {formatDuration(item.tiempoAcumuladoSegundos)}
                        </span>
                      ) : null}
                    </div>
                    {item.nota ? <div className="mt-2 text-sm text-slate-600">{item.nota}</div> : null}
                    {onAssign ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                          value={selectedEmployeeId}
                          onChange={(event) => setSelectedByOccurrence((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))}
                          disabled={isBusy}
                        >
                          <option value="">Seleccionar responsable</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="rounded-full bg-sidebar-bg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isBusy || !selectedEmployeeId}
                          onClick={() => onAssign({ occurrenceId: item.id, empleadoId: Number(selectedEmployeeId) })}
                        >
                          {item.responsableActualId ? 'Reasignar' : 'Asignar'}
                        </button>
                        {onRelease && item.responsableActualId ? (
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => onRelease({ occurrenceId: item.id })}
                          >
                            Liberar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${tone.color}20`, color: tone.color }}
                  >
                    {tone.label}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function formatClockLabel(value?: string | number | Date | null) {
  if (!value) return '--:--'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds ?? 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainingSeconds = safe % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}
