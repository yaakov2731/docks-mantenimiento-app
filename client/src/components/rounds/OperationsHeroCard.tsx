type Resumen = {
  total: number
  pendientes: number
  activas: number
  cumplidos: number
  vencidos: number
  estadoGeneral: string
  proximoControl: { hora: string; responsable: string } | null
}

function deriveStatusTone(resumen?: Resumen) {
  if (!resumen) return 'cargando'
  if (Number(resumen.vencidos) > 0) return 'atrasado'
  if (Number(resumen.activas) > 0) return 'activo'
  if (Number(resumen.pendientes) > 0) return 'pendiente'
  return 'estable'
}

export function OperationsHeroCard({ resumen, isLoading }: { resumen?: Resumen; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6 animate-pulse">
        <div className="h-3 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-8 w-64 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 rounded bg-slate-200" />
      </div>
    )
  }

  const tone = deriveStatusTone(resumen)

  if (!resumen?.total) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          Centro de control diario
        </div>
        <div className="mt-3 font-heading text-[26px] font-semibold text-sidebar-bg">
          Sin rondas cargadas para hoy
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Creá una programación desde el botón "Nueva ronda" y la secuencia del día aparecerá aquí automáticamente.
        </p>
      </div>
    )
  }

  const wrapperClass =
    tone === 'atrasado'
      ? 'border border-rose-200 bg-rose-50 text-rose-950'
      : tone === 'activo'
        ? 'border border-blue-200 bg-blue-50 text-blue-950'
        : tone === 'pendiente'
          ? 'border border-amber-200 bg-amber-50 text-amber-950'
          : 'bg-[linear-gradient(135deg,#2563EB,#1E40AF)] text-white'

  const eyebrowClass =
    tone === 'estable'
      ? 'text-cyan-100/80'
      : tone === 'pendiente'
        ? 'text-amber-600'
        : tone === 'activo'
          ? 'text-blue-500'
          : 'text-rose-500'

  const bodyClass =
    tone === 'estable'
      ? 'text-cyan-50/90'
      : tone === 'pendiente'
        ? 'text-amber-900/80'
        : tone === 'activo'
          ? 'text-blue-900/80'
          : 'text-rose-950/80'

  const title =
    tone === 'atrasado'
      ? 'Operación atrasada'
      : tone === 'activo'
        ? 'Operación en curso'
        : tone === 'pendiente'
          ? 'Operación en seguimiento'
          : 'Operación estable'

  const subtitle =
    tone === 'atrasado'
      ? 'Hay controles vencidos que requieren seguimiento inmediato.'
      : tone === 'activo'
        ? 'Hay rondas en ejecución ahora mismo.'
        : tone === 'pendiente'
          ? 'El día sigue activo con controles pendientes.'
          : 'La secuencia del día está bajo control y sin desvíos críticos.'

  return (
    <div className={`rounded-[24px] p-5 md:p-6 ${wrapperClass}`}>
      <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${eyebrowClass}`}>
        Centro de control diario
      </div>
      <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="font-heading text-[24px] leading-tight font-semibold md:text-[30px]">{title}</div>
          <p className={`mt-2 max-w-2xl text-sm ${bodyClass}`}>{subtitle}</p>
        </div>
        <div className={`grid gap-3 sm:grid-cols-3 xl:grid-cols-5 ${tone === 'estable' ? 'text-cyan-50' : bodyClass}`}>
          <Metric label="Total hoy" value={resumen.total} />
          <Metric label="Cumplidas" value={resumen.cumplidos} accent="green" tone={tone} />
          <Metric label="En curso" value={resumen.activas} accent="blue" tone={tone} />
          <Metric label="Pendientes" value={resumen.pendientes} />
          <Metric
            label="Vencidas"
            value={resumen.vencidos}
            accent={resumen.vencidos > 0 ? 'red' : undefined}
            tone={tone}
          />
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'green' | 'blue' | 'red'
  tone?: string
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-500'
      : accent === 'blue'
        ? 'text-blue-400'
        : accent === 'red'
          ? 'text-rose-500'
          : ''

  return (
    <div className="min-w-[110px] rounded-[18px] border border-black/5 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className={`mt-2 font-heading text-[22px] leading-none font-semibold ${accentClass}`}>{value}</div>
    </div>
  )
}
