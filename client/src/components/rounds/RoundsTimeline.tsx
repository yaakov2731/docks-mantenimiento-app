import { RONDAS_ESTADOS } from '../../../../shared/const'

export function RoundsTimeline({ items }: { items: any[] }) {
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
            return (
              <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[88px_1fr_auto] md:items-center">
                  <div className="font-heading text-[26px] leading-none font-semibold text-sidebar-bg">
                    {item.programadoAtLabel ?? '--:--'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.nombreRonda ?? 'Ronda operativa'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.empleadoNombre ?? 'Sin responsable'}
                      {item.canalConfirmacion ? ` · ${item.canalConfirmacion}` : ''}
                      {item.escaladoAt ? ' · Escalado' : ''}
                    </div>
                    {item.nota ? <div className="mt-2 text-sm text-slate-600">{item.nota}</div> : null}
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
