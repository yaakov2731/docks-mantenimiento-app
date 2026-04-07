export function OperationsSupportRail({ resumen, empleados }: { resumen: any; empleados: any[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SupportCard
        label="Controles del día"
        value={resumen?.total ?? 0}
        detail="Volumen total visible en la fecha operativa seleccionada."
      />
      <SupportCard
        label="Cobertura disponible"
        value={empleados.length}
        detail="Responsables cargados y listos para asignación desde el panel."
      />
      <SupportCard
        label="Escalación"
        value={resumen?.vencidos ?? 0}
        detail="Los vencidos usan supervisor directo y fallback admin desde backend."
      />
    </div>
  )
}

function SupportCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="surface-panel rounded-[20px] p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 font-heading text-[26px] font-semibold text-sidebar-bg">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{detail}</div>
    </div>
  )
}
