export function RoundsSummaryCard({ resumen }: { resumen: any }) {
  const overdue = Number(resumen?.vencidos ?? 0)
  const delayed = overdue > 0
  const nextLabel = resumen?.proximoControl?.hora ?? '--:--'
  const lastConfirmation = resumen?.ultimaConfirmacion ?? 'Sin confirmaciones'
  const responsible = resumen?.proximoControl?.responsable ?? 'Sin asignar'

  return (
    <div className={`rounded-[22px] border p-4 ${delayed ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
      <div className={`text-[11px] uppercase tracking-[0.18em] ${delayed ? 'text-rose-500' : 'text-slate-400'}`}>Rondas operativas</div>
      <div className={`mt-2 font-heading text-[22px] font-semibold ${delayed ? 'text-rose-900' : 'text-sidebar-bg'}`}>
        {overdue} controles vencidos hoy
      </div>
      <div className="mt-2 text-sm text-slate-600">Próximo control {nextLabel}</div>
      <div className="mt-1 text-sm text-slate-600">Última confirmación {lastConfirmation}</div>
      <div className="mt-1 text-sm text-slate-600">Responsable actual {responsible}</div>
    </div>
  )
}
