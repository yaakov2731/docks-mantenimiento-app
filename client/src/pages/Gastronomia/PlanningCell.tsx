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
      className={`gastro-plan-cell w-full rounded-[14px] border p-2 text-left transition active:scale-[0.99] ${
        isDraft
          ? 'gastro-plan-cell-draft ring-1'
          : savedTurno
            ? 'gastro-plan-cell-saved'
            : 'gastro-plan-cell-empty border-dashed'
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
            <div className="gastro-plan-cell-time text-[11px] font-semibold">
              {horaEntrada}–{horaSalida}
            </div>
          ) : (
            <div className="gastro-plan-cell-muted text-[11px]">No trabaja</div>
          )}
          {puesto && (
            <div className="gastro-plan-cell-muted mt-0.5 truncate text-[10px]">{puesto}</div>
          )}
        </>
      ) : (
        <div className="gastro-plan-cell-muted py-2 text-center text-[10px]">+ Agregar</div>
      )}
    </button>
  )
}
