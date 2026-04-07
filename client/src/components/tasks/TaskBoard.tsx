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
    <div className="surface-panel relative overflow-hidden rounded-[22px] p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(135deg,rgba(14,116,144,0.08),transparent_70%)]" />
      <div className="relative">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Visión por estado</div>
        <h3 className="mt-2 font-heading text-lg font-semibold text-sidebar-bg">Tablero operativo</h3>
        <p className="mt-2 text-sm text-slate-500">
          Lectura rápida de qué está sin asignar, qué está corriendo y qué quedó pausado o ya resuelto.
        </p>
      </div>

      <div className="relative mt-5 grid gap-4">
        {TASK_SECTIONS.map((section) => {
          const sectionItems = items.filter((item) => item.estado === section.key)
          const sectionTone = getSectionTone(section.key)
          return (
            <section
              key={section.key}
              className="rounded-[20px] border p-4"
              style={{
                borderColor: sectionTone.border,
                background: sectionTone.background,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-base font-semibold text-sidebar-bg">{section.title}</div>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                  style={{ backgroundColor: sectionTone.badgeBg, color: sectionTone.badgeText }}
                >
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
  const stateTone = getSectionTone(item.estado)

  return (
    <div className="rounded-[20px] border bg-white px-4 py-4 shadow-sm" style={{ borderColor: stateTone.border }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">#{String(item.id).padStart(4, '0')}</div>
          <div className="mt-1 font-semibold text-slate-800">{item.titulo}</div>
          <div className="mt-1 text-xs text-slate-500">
            {item.tipoTrabajo ?? 'Trabajo general'}
            {item.empleadoNombre ? ` · ${item.empleadoNombre}` : ' · Sin responsable'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${priority?.color ?? '#64748B'}20`, color: priority?.color ?? '#64748B' }}
          >
            {priority?.label ?? item.prioridad}
          </div>
          <div
            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ backgroundColor: stateTone.badgeBg, color: stateTone.badgeText }}
          >
            {stateTone.label}
          </div>
        </div>
      </div>

      <div
        className="mt-3 rounded-[16px] px-3 py-3 text-sm text-slate-600"
        style={{ background: stateTone.panel }}
      >
        <div className="font-medium text-slate-700">{item.ubicacion}</div>
        <div className="mt-1">{item.descripcion}</div>
      </div>
    </div>
  )
}

function getSectionTone(state: string) {
  switch (state) {
    case 'pendiente_asignacion':
      return {
        label: 'Sin asignar',
        border: '#FCD34D',
        background: 'linear-gradient(180deg, rgba(254,243,199,0.52), rgba(255,255,255,0.9))',
        panel: 'linear-gradient(180deg, rgba(255,247,237,0.9), rgba(255,255,255,0.96))',
        badgeBg: '#FEF3C7',
        badgeText: '#B45309',
      }
    case 'pendiente_confirmacion':
      return {
        label: 'Pendiente',
        border: '#FDBA74',
        background: 'linear-gradient(180deg, rgba(255,237,213,0.56), rgba(255,255,255,0.92))',
        panel: 'linear-gradient(180deg, rgba(255,247,237,0.92), rgba(255,255,255,0.96))',
        badgeBg: '#FFEDD5',
        badgeText: '#C2410C',
      }
    case 'en_progreso':
      return {
        label: 'Activa',
        border: '#67E8F9',
        background: 'linear-gradient(180deg, rgba(207,250,254,0.7), rgba(255,255,255,0.92))',
        panel: 'linear-gradient(180deg, rgba(236,254,255,0.9), rgba(255,255,255,0.98))',
        badgeBg: '#CFFAFE',
        badgeText: '#0F766E',
      }
    case 'pausada':
      return {
        label: 'Pausada',
        border: '#CBD5E1',
        background: 'linear-gradient(180deg, rgba(241,245,249,0.9), rgba(255,255,255,0.94))',
        panel: 'linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.98))',
        badgeBg: '#E2E8F0',
        badgeText: '#475569',
      }
    case 'terminada':
      return {
        label: 'Terminada',
        border: '#86EFAC',
        background: 'linear-gradient(180deg, rgba(220,252,231,0.82), rgba(255,255,255,0.94))',
        panel: 'linear-gradient(180deg, rgba(240,253,244,0.9), rgba(255,255,255,0.98))',
        badgeBg: '#DCFCE7',
        badgeText: '#15803D',
      }
    default:
      return {
        label: state,
        border: '#E2E8F0',
        background: 'linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.94))',
        panel: 'linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.98))',
        badgeBg: '#E2E8F0',
        badgeText: '#475569',
      }
  }
}
