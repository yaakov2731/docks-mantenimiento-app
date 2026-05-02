import { useState } from 'react'
import { RONDAS_ESTADOS } from '../../../../shared/const'

type Employee = {
  id: number
  nombre: string
  activo?: boolean
}

const SORT_ORDER: Record<string, number> = {
  vencido: 0,
  en_progreso: 1,
  pendiente: 2,
  programado: 3,
  pausada: 4,
  cumplido_con_observacion: 5,
  cumplido: 6,
}

function todayDatetimeLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export function RoundsTimeline({
  items,
  empleados,
  onAssign,
  onRelease,
  onDelete,
  onReschedule,
  isLoading,
}: {
  items: any[]
  empleados: Employee[]
  onAssign: (occurrenceId: number, empleadoId: number) => Promise<void>
  onRelease: (occurrenceId: number) => Promise<void>
  onDelete?: (occurrenceId: number) => Promise<void>
  onReschedule?: (occurrenceId: number, programadoAt: string, fechaOperativa: string) => Promise<void>
  isLoading?: boolean
  /** @deprecated — per-row loading is now handled internally */
  assigning?: boolean
  /** @deprecated — per-row loading is now handled internally */
  releasing?: boolean
}) {
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, string>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [rescheduleId, setRescheduleId] = useState<number | null>(null)
  const [rescheduleValue, setRescheduleValue] = useState('')

  const sorted = [...items].sort((a, b) => {
    const ao = SORT_ORDER[a.estado] ?? 99
    const bo = SORT_ORDER[b.estado] ?? 99
    if (ao !== bo) return ao - bo
    // secondary sort: scheduled time ascending
    return (a.programadoAtLabel ?? '').localeCompare(b.programadoAtLabel ?? '')
  })

  return (
    <div className="surface-panel rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Secuencia del día</div>
          <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Timeline operativo</h3>
          <p className="mt-2 text-sm text-slate-500">
            La app y el bot comparten el mismo responsable actual por ocurrencia. Los relevos quedan auditados.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : sorted.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay rondas programadas para hoy.
            <br />
            <span className="text-slate-400">Usá "+ Nueva ronda" para crear la primera.</span>
          </div>
        ) : (
          sorted.map((item) => {
            const tone = RONDAS_ESTADOS.find((s) => s.value === item.estado) ?? RONDAS_ESTADOS[0]
            const isThisLoading = loadingId === item.id
            const selectedEmployee = selectedEmployees[item.id] ?? String(item.responsableActualId ?? '')
            const responsable = item.responsableActualNombre ?? item.empleadoNombre ?? null
            const programadoNombre = item.responsableProgramadoNombre ?? item.empleadoNombre ?? null
            const showPlanned = programadoNombre && programadoNombre !== responsable

            return (
              <div key={item.id} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
                <div className="flex">
                  {/* Left color bar */}
                  <div className="w-1 flex-shrink-0 rounded-l-[18px]" style={{ backgroundColor: tone.color }} />

                  <div className="flex-1 px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-[80px_1fr_auto] md:items-start">
                      {/* Scheduled time */}
                      <div className="font-heading text-[26px] leading-none font-semibold text-sidebar-bg">
                        {item.programadoAtLabel ?? '--:--'}
                      </div>

                      {/* Main info */}
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{item.nombreRonda ?? 'Ronda operativa'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {responsable ? (
                            <>
                              <span className="font-medium text-slate-700">{responsable}</span>
                              {item.asignacionEstado ? ` · ${item.asignacionEstado}` : ''}
                              {item.escaladoAt ? ' · Escalado' : ''}
                            </>
                          ) : (
                            <span className="text-amber-600">Sin responsable asignado</span>
                          )}
                        </div>

                        {showPlanned ? (
                          <div className="mt-1 text-xs text-amber-700">Programado: {programadoNombre}</div>
                        ) : null}

                        {/* Time chips */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.inicioRealAt ? (
                            <TimeChip label="Inicio" value={item.inicioRealAt} color={tone.color} />
                          ) : null}
                          {item.finRealAt ? (
                            <TimeChip label="Fin" value={item.finRealAt} color={tone.color} />
                          ) : null}
                          {item.tiempoAcumuladoSegundos > 0 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                              {formatDuration(item.tiempoAcumuladoSegundos)}
                            </span>
                          ) : null}
                        </div>

                        {item.nota ? <div className="mt-2 text-sm text-slate-600">{item.nota}</div> : null}

                        {/* Assign panel */}
                        <div className="mt-4 flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
                          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                            Asignación compartida app/bot
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row">
                            <select
                              className="min-w-0 flex-1 rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                              value={selectedEmployee}
                              disabled={isThisLoading}
                              onChange={(e) => {
                                setSelectedEmployees((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }}
                            >
                              <option value="">Seleccionar empleado</option>
                              {empleados
                                .filter((emp) => emp.activo !== false)
                                .map((emp) => (
                                  <option key={emp.id} value={String(emp.id)}>
                                    {emp.nombre}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              className="rounded-[12px] bg-[#2D7D52] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                              disabled={!selectedEmployee || isThisLoading}
                              onClick={async () => {
                                setLoadingId(item.id)
                                try {
                                  await onAssign(item.id, Number(selectedEmployee))
                                } finally {
                                  setLoadingId(null)
                                }
                              }}
                            >
                              {isThisLoading ? '...' : item.responsableActualId ? 'Reasignar' : 'Asignar'}
                            </button>
                            <button
                              type="button"
                              className="rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!item.responsableActualId || isThisLoading}
                              onClick={async () => {
                                setLoadingId(item.id)
                                try {
                                  await onRelease(item.id)
                                  setSelectedEmployees((prev) => ({ ...prev, [item.id]: '' }))
                                } finally {
                                  setLoadingId(null)
                                }
                              }}
                            >
                              {isThisLoading ? '...' : 'Liberar'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status badge + actions */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: `${tone.color}20`, color: tone.color }}
                        >
                          {tone.label}
                        </span>
                        {item.estado === 'vencido' && item.minutosTarde != null ? (
                          <span className="text-[11px] font-medium text-rose-600">
                            +{item.minutosTarde} min
                          </span>
                        ) : null}

                        {/* Admin actions */}
                        <div className="mt-1 flex flex-col gap-1">
                          {onReschedule && rescheduleId !== item.id && (
                            <button
                              type="button"
                              className="rounded-[10px] border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              disabled={isThisLoading}
                              onClick={() => {
                                setRescheduleId(item.id)
                                setRescheduleValue(todayDatetimeLocal())
                              }}
                            >
                              Reprogramar
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              className="rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              disabled={isThisLoading}
                              onClick={async () => {
                                if (!window.confirm('¿Eliminar esta ronda? La acción no se puede deshacer.')) return
                                setLoadingId(item.id)
                                try {
                                  await onDelete(item.id)
                                } finally {
                                  setLoadingId(null)
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>

                        {/* Inline reschedule panel */}
                        {rescheduleId === item.id && (
                          <div className="mt-1 flex flex-col gap-1.5 rounded-[12px] border border-amber-200 bg-amber-50 p-2.5 text-[11px]">
                            <span className="font-medium text-amber-800">Nueva fecha y hora</span>
                            <input
                              type="datetime-local"
                              className="rounded-[8px] border border-amber-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                              value={rescheduleValue}
                              onChange={(e) => setRescheduleValue(e.target.value)}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="flex-1 rounded-[8px] bg-amber-600 px-2 py-1 font-medium text-white disabled:opacity-50"
                                disabled={!rescheduleValue || isThisLoading}
                                onClick={async () => {
                                  if (!rescheduleValue || !onReschedule) return
                                  const dt = new Date(rescheduleValue)
                                  const fechaOperativa = dt.toLocaleDateString('en-CA', {
                                    timeZone: 'America/Argentina/Buenos_Aires',
                                  })
                                  setLoadingId(item.id)
                                  try {
                                    await onReschedule(item.id, dt.toISOString(), fechaOperativa)
                                    setRescheduleId(null)
                                  } finally {
                                    setLoadingId(null)
                                  }
                                }}
                              >
                                {isThisLoading ? '...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                className="rounded-[8px] border border-amber-300 bg-white px-2 py-1 text-amber-700"
                                onClick={() => setRescheduleId(null)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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

function TimeChip({ label, value, color }: { label: string; value?: string | number | Date | null; color: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label} {formatClockLabel(value)}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white animate-pulse">
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-l-[18px] bg-slate-200" />
        <div className="flex-1 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[80px_1fr_auto]">
            <div className="h-8 w-16 rounded bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-200" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
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
  const remaining = safe % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remaining}s`
  return `${remaining}s`
}
