function deriveStatusTone(resumen: any) {
  if (Number(resumen?.vencidos ?? 0) > 0) return 'atrasado'
  if (Number(resumen?.pendientes ?? 0) > 0) return 'pendiente'
  return 'estable'
}

export function OperationsHeroCard({ resumen }: { resumen: any }) {
  const tone = deriveStatusTone(resumen)
  const nextCheckpoint = resumen?.proximoControl?.hora ?? '--:--'
  const nextResponsible = resumen?.proximoControl?.responsable ?? 'Sin asignar'

  if (!resumen?.total) {
    return (
      <div className="surface-panel-strong rounded-[24px] p-5 md:p-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Centro de control diario</div>
        <div className="mt-3 font-heading text-[26px] font-semibold text-sidebar-bg">Sin rondas cargadas para hoy</div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Creá una programación desde el formulario y la secuencia operativa del día aparecerá automáticamente en esta vista.
        </p>
      </div>
    )
  }

  const wrapperClass = tone === 'atrasado'
    ? 'border border-rose-200 bg-rose-50 text-rose-950'
    : tone === 'pendiente'
      ? 'border border-amber-200 bg-amber-50 text-amber-950'
      : 'bg-[linear-gradient(135deg,#2563EB,#1E40AF)] text-white'
  const eyebrowClass = tone === 'estable' ? 'text-cyan-100/80' : tone === 'pendiente' ? 'text-amber-600' : 'text-rose-500'
  const bodyClass = tone === 'estable' ? 'text-cyan-50/90' : tone === 'pendiente' ? 'text-amber-900/80' : 'text-rose-950/80'

  return (
    <div className={`rounded-[24px] p-5 md:p-6 ${wrapperClass}`}>
      <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${eyebrowClass}`}>Centro de control diario</div>
      <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="font-heading text-[24px] leading-tight font-semibold md:text-[30px]">
            {tone === 'atrasado' ? 'Operación atrasada' : tone === 'pendiente' ? 'Operación en seguimiento' : 'Operación estable'}
          </div>
          <p className={`mt-2 max-w-2xl text-sm ${bodyClass}`}>
            {tone === 'atrasado'
              ? 'Hay controles vencidos que requieren seguimiento inmediato.'
              : tone === 'pendiente'
                ? 'El día sigue activo con controles pendientes y próxima revisión en curso.'
                : 'La secuencia del día está bajo control y sin desvíos críticos.'}
          </p>
        </div>
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${tone === 'estable' ? 'text-cyan-50' : bodyClass}`}>
          <Metric label="Vencidos" value={resumen?.vencidos ?? 0} />
          <Metric label="Pendientes" value={resumen?.pendientes ?? 0} />
          <Metric label="Próximo control" value={nextCheckpoint} />
          <Metric label="Responsable actual" value={nextResponsible} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[132px] rounded-[18px] border border-black/5 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-2 font-heading text-[22px] leading-none font-semibold">{value}</div>
    </div>
  )
}
