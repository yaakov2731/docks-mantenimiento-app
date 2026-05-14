import { CheckCircle2 } from 'lucide-react'
import { statusClass, statusLabel, type DraftTurno } from './types'

type SavedTurno = {
  id: number
  estado: string
  horaEntrada: string
  horaSalida: string
  puesto?: string
}

type Props = {
  savedTurno?: SavedTurno
  draft?: DraftTurno
  isDraft: boolean
  onClick: () => void
}

export function PlanningCell({ savedTurno, draft, isDraft, onClick }: Props) {
  const trabaja = draft?.trabaja ?? savedTurno !== undefined
  const horaEntrada = draft?.horaEntrada ?? savedTurno?.horaEntrada
  const horaSalida = draft?.horaSalida ?? savedTurno?.horaSalida
  const puesto = draft?.puesto ?? savedTurno?.puesto

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[14px] border p-2 text-left transition hover:ring-1 hover:ring-slate-300 active:scale-[0.99] ${
        isDraft
          ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200'
          : savedTurno
            ? 'border-slate-200 bg-slate-50'
            : 'border-dashed border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {savedTurno || isDraft ? (
        <>
          <div className="mb-1 flex items-center justify-between gap-1">
            {isDraft ? (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                Sin guardar
              </span>
            ) : savedTurno?.estado ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${statusClass(savedTurno.estado)}`}
              >
                {statusLabel(savedTurno.estado)}
              </span>
            ) : null}
            {savedTurno?.estado === 'confirmado' && (
              <CheckCircle2 size={11} className="text-emerald-600" />
            )}
          </div>
          {trabaja ? (
            <div className="text-[11px] font-semibold text-slate-800">
              {horaEntrada}–{horaSalida}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">No trabaja</div>
          )}
          {puesto && (
            <div className="mt-0.5 truncate text-[10px] text-slate-500">{puesto}</div>
          )}
        </>
      ) : (
        <div className="py-2 text-center text-[10px] text-slate-300">+ Agregar</div>
      )}
    </button>
  )
}
