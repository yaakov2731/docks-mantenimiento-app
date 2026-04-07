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
              Cada tarjeta resume la tarea activa y la cola confirmable que ya tiene ese empleado.
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
              <div key={bucket.empleado.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-heading text-base font-semibold text-sidebar-bg">{bucket.empleado.nombre}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {bucket.activeTask ? 'Con una tarea activa' : 'Sin tarea activa'}
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {bucket.assigned.length} total
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  <Summary label="Activa" value={bucket.activeTask?.titulo ?? 'Ninguna'} accent={bucket.activeTask ? 'text-cyan-700' : 'text-slate-400'} />
                  <Summary label="En cola" value={bucket.queuedTasks.length} />
                  <Summary label="Pausadas" value={bucket.pausedTasks.length} />
                  <Summary label="Terminadas visibles" value={bucket.completedToday.length} />
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Summary({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-slate-50 px-3 py-2.5">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className={`font-medium ${accent ?? 'text-slate-700'}`}>{value}</span>
    </div>
  )
}
