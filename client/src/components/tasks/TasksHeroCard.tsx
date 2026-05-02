function deriveTaskTone(resumen: any) {
  if (Number(resumen?.pendientesAsignacion ?? 0) > 0) return 'requiere_accion'
  if (Number(resumen?.pausadas ?? 0) > 0 || Number(resumen?.pendientesConfirmacion ?? 0) > 0) return 'seguimiento'
  if (Number(resumen?.activas ?? 0) > 0) return 'activo'
  return 'estable'
}

export function TasksHeroCard({
  resumen,
  isLoading = false,
}: {
  resumen: any
  isLoading?: boolean
}) {
  if (isLoading && !resumen) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Control operativo</div>
        <div className="mt-3 font-heading text-[26px] font-semibold text-sidebar-bg">Cargando tablero de tareas</div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Estamos reuniendo la carga actual, las colas pendientes y los cierres del día.
        </p>
      </div>
    )
  }

  if (!resumen?.total) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Control operativo</div>
        <div className="mt-3 font-heading text-[26px] font-semibold text-sidebar-bg">Sin tareas operativas cargadas</div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Cuando cargues una tarea bajo demanda, el tablero va a mostrar estado, cola asignada y ritmo de cierre.
        </p>
      </div>
    )
  }

  const tone = deriveTaskTone(resumen)
  const pendingLoad = Number(resumen?.pendientesAsignacion ?? 0) + Number(resumen?.pendientesConfirmacion ?? 0)
  const wrapperClass = tone === 'requiere_accion'
    ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-950'
    : tone === 'seguimiento'
      ? 'border border-slate-300 bg-gradient-to-br from-slate-50 to-white text-slate-950'
      : tone === 'activo'
        ? 'bg-[linear-gradient(135deg,#2D7D52,#1A5C3A)] text-white'
        : 'bg-[linear-gradient(135deg,#14532D,#166534)] text-white'
  const eyebrowClass = tone === 'activo' || tone === 'estable'
    ? 'text-white/70'
    : tone === 'requiere_accion'
      ? 'text-amber-600'
      : 'text-slate-400'
  const bodyClass = tone === 'activo' || tone === 'estable'
    ? 'text-white/85'
    : tone === 'requiere_accion'
      ? 'text-amber-900/80'
      : 'text-slate-600'

  return (
    <div className={`relative overflow-hidden rounded-[24px] p-5 md:p-6 ${wrapperClass}`}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)]" />
      <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${eyebrowClass}`}>Control operativo</div>
      <div className="relative mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="font-heading text-[24px] leading-tight font-semibold md:text-[30px]">
            {tone === 'requiere_accion'
              ? 'Hay tareas esperando definición'
              : tone === 'seguimiento'
                ? 'La operación necesita seguimiento'
                : tone === 'activo'
                  ? 'La operación está en marcha'
                  : 'La carga operativa está controlada'}
          </div>
          <p className={`mt-2 max-w-2xl text-sm ${bodyClass}`}>
            {tone === 'requiere_accion'
              ? 'Todavía hay trabajos sin asignar o en espera de confirmación. Conviene ordenar responsables y prioridad.'
              : tone === 'seguimiento'
                ? 'Hay tareas pausadas o en cola de aceptación. El tablero te muestra dónde está la fricción.'
                : tone === 'activo'
                  ? 'El equipo ya está ejecutando trabajos y la cola del día sigue visible por empleado.'
                  : 'No hay atrasos relevantes y el volumen del día está resuelto o encaminado.'}
          </p>
        </div>
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${bodyClass}`}>
          <Metric label="Activas" value={resumen?.activas ?? 0} tone={tone} />
          <Metric label="Pendientes" value={pendingLoad} tone={tone} />
          <Metric label="Terminadas hoy" value={resumen?.terminadasHoy ?? 0} tone={tone} />
          <Metric label="Colas altas" value={resumen?.empleadosConColaAlta ?? 0} tone={tone} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const isDark = tone === 'activo' || tone === 'estable'
  return (
    <div className={`min-w-[132px] rounded-[20px] border px-4 py-3 ${isDark ? 'border-white/20 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="mt-2 font-heading text-[22px] leading-none font-semibold">{value}</div>
    </div>
  )
}
