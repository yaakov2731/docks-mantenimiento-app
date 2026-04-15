import WorkingTime from '../WorkingTime'

type EmployeeQueueCardProps = {
  items: any[]
  empleados: any[]
}

export function EmployeeQueueCard({ items, empleados }: EmployeeQueueCardProps) {
  const employeeBuckets = empleados
    .map((empleado) => {
      const assigned = items.filter((item) => item.empleadoId === empleado.id)
      const activeTask = assigned.find((item) => item.estado === 'en_progreso')
      const queuedTasks = assigned.filter((item) => item.estado === 'pendiente_confirmacion')
      const pausedTasks = assigned.filter((item) => item.estado === 'pausada')
      const completedToday = assigned.filter((item) => item.estado === 'terminada')
      return {
        empleado,
        assigned,
        activeTask,
        queuedTasks,
        pausedTasks,
        completedToday,
      }
    })
    .filter((bucket) => bucket.assigned.length > 0)
    .sort((left, right) =>
      Number(Boolean(right.activeTask)) - Number(Boolean(left.activeTask)) ||
      right.queuedTasks.length - left.queuedTasks.length ||
      right.pausedTasks.length - left.pausedTasks.length ||
      left.empleado.nombre.localeCompare(right.empleado.nombre)
    )

  const unassigned = items.filter((item) => !item.empleadoId)

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="surface-panel rounded-[22px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Carga por empleado</div>
            <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Cola asignada</h3>
            <p className="mt-2 text-sm text-slate-500">
              Cada tarjeta resume el estado operativo, el reloj activo y la cola pendiente del empleado.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {employeeBuckets.length} con carga
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {employeeBuckets.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 md:col-span-2">
              Todavía no hay tareas asignadas a empleados. Cuando definas responsables, la cola aparecerá acá.
            </div>
          ) : (
            employeeBuckets.map((bucket) => (
              <div key={bucket.empleado.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-[linear-gradient(135deg,#0F172A,#155E75)] px-4 py-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-base font-semibold">{bucket.empleado.nombre}</div>
                      <div className="mt-1 text-xs text-cyan-50/75">
                        {bucket.activeTask ? 'Tarea activa en curso' : bucket.queuedTasks.length > 0 ? 'Con tareas esperando aceptación' : 'Sin tarea activa'}
                      </div>
                    </div>
                    <div className="min-w-[146px] rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-50/65">
                        {bucket.activeTask ? 'Tarea activa' : bucket.pausedTasks.length > 0 ? 'Tarea pausada' : 'Sin reloj'}
                      </div>
                      <WorkingTime
                        seconds={bucket.activeTask?.tiempoTrabajadoSegundos ?? bucket.pausedTasks[0]?.tiempoTrabajadoSegundos ?? 0}
                        isRunning={Boolean(bucket.activeTask)}
                        variant="clock"
                        className={`mt-2 block font-heading text-[24px] leading-none font-semibold tracking-[0.08em] ${bucket.activeTask ? 'text-white' : 'text-amber-200'}`}
                      />
                      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.16em]">
                        <span className={`h-2 w-2 rounded-full ${bucket.activeTask ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]' : bucket.pausedTasks.length > 0 ? 'bg-amber-300' : 'bg-white/20'}`} />
                        <span className={bucket.activeTask ? 'text-cyan-50/70' : 'text-amber-100/80'}>
                          {bucket.activeTask ? 'Reloj corriendo' : bucket.pausedTasks.length > 0 ? 'Tiempo pausado' : 'Sin cronómetro'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[16px] bg-white/10 px-3 py-3 text-sm text-cyan-50/85">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-cyan-50/60">Trabajo visible</div>
                    <div className="mt-2 font-medium text-white">
                      {bucket.activeTask?.titulo ?? bucket.pausedTasks[0]?.titulo ?? 'Sin tarea en curso'}
                    </div>
                    <div className="mt-1 text-xs text-cyan-50/70">
                      {bucket.activeTask?.ubicacion ?? bucket.pausedTasks[0]?.ubicacion ?? 'La siguiente tarea queda disponible debajo.'}
                    </div>
                    {bucket.activeTask?.trabajoIniciadoAt || bucket.pausedTasks[0]?.pausadoAt ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-cyan-50/75">
                        {bucket.activeTask?.trabajoIniciadoAt ? (
                          <span className="rounded-full bg-white/10 px-2.5 py-1">
                            Inicio {formatClockLabel(bucket.activeTask.trabajoIniciadoAt)}
                          </span>
                        ) : null}
                        {bucket.pausedTasks[0]?.pausadoAt ? (
                          <span className="rounded-full bg-white/10 px-2.5 py-1">
                            Pausa {formatClockLabel(bucket.pausedTasks[0].pausadoAt)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 p-4 text-sm">
                  <Summary label="En cola" value={bucket.queuedTasks.length} />
                  <Summary label="Pausadas" value={bucket.pausedTasks.length} />
                  <Summary label="Terminadas visibles" value={bucket.completedToday.length} />
                  <Summary label="Carga total" value={bucket.assigned.length} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="surface-panel rounded-[22px] p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Sin asignación</div>
        <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Trabajos en espera</h3>
        <p className="mt-2 text-sm text-slate-500">
          Tareas que todavía no tienen responsable y pueden convertirse en cuello de botella.
        </p>

        <div className="mt-4 grid gap-3">
          {unassigned.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No hay tareas sin asignar en este momento.
            </div>
          ) : (
            unassigned.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-xs font-mono text-slate-400">#{String(item.id).padStart(4, '0')}</div>
                <div className="mt-1 font-semibold text-slate-800">{item.titulo}</div>
                <div className="mt-1 text-sm text-slate-500">{item.ubicacion}</div>
                <div className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Esperando asignación
                </div>
              </div>
            ))
          )}
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

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-100 bg-[linear-gradient(180deg,#F8FAFC,#FFFFFF)] px-3 py-2.5">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  )
}
