import { PRIORIDADES } from '../../../../shared/const'

const TASK_SECTIONS = [
  {
    key: 'pendiente_asignacion',
    title: 'Sin asignar',
    description: 'Trabajos cargados que todavía no tienen responsable definido.',
  },
  {
    key: 'pendiente_confirmacion',
    title: 'Pendiente confirmación',
    description: 'El responsable ya fue elegido, pero todavía no aceptó la tarea.',
  },
  {
    key: 'en_progreso',
    title: 'En progreso',
    description: 'Tareas activas con reloj corriendo.',
  },
  {
    key: 'pausada',
    title: 'Pausadas',
    description: 'Trabajos que necesitan seguimiento para retomar o reasignar.',
  },
  {
    key: 'terminada',
    title: 'Terminadas',
    description: 'Cierres recientes del día visibles para control operativo.',
  },
] as const

type TaskBoardProps = {
  items: any[]
}

export function TaskBoard({ items }: TaskBoardProps) {
  return (
    <div className="surface-panel rounded-[22px] p-5">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Visión por estado</div>
        <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Tablero operativo</h3>
        <p className="mt-2 text-sm text-slate-500">
          Lectura rápida de qué está sin asignar, qué está corriendo y qué quedó pausado o ya resuelto.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        {TASK_SECTIONS.map((section) => {
          const sectionItems = items.filter((item) => item.estado === section.key)
          return (
            <section key={section.key} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-base font-semibold text-sidebar-bg">{section.title}</div>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {sectionItems.length}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {sectionItems.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    No hay tareas en este estado ahora mismo.
                  </div>
                ) : (
                  sectionItems.map((item) => <TaskCard key={item.id} item={item} />)
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({ item }: { item: any }) {
  const priority = PRIORIDADES.find((entry) => entry.value === item.prioridad)

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">#{String(item.id).padStart(4, '0')}</div>
          <div className="mt-1 font-semibold text-slate-800">{item.titulo}</div>
          <div className="mt-1 text-xs text-slate-500">
            {item.tipoTrabajo ?? 'Trabajo general'}
            {item.empleadoNombre ? ` · ${item.empleadoNombre}` : ' · Sin responsable'}
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${priority?.color ?? '#64748B'}20`, color: priority?.color ?? '#64748B' }}
        >
          {priority?.label ?? item.prioridad}
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-slate-50 px-3 py-3 text-sm text-slate-600">
        <div className="font-medium text-slate-700">{item.ubicacion}</div>
        <div className="mt-1">{item.descripcion}</div>
      </div>
    </div>
  )
}
