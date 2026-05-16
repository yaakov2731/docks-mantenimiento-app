import { ChevronLeft, ChevronRight, MessageSquareText, Users } from 'lucide-react'
import { SECTORES_GASTRONOMIA } from '@shared/const'

type Props = {
  weekDays: string[]
  sector: string
  pendingToSend: number
  confirmed: number
  rejected: number
  draftCount: number
  isPublishing: boolean
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
  onSectorChange: (sector: string) => void
  onPublishWeek: () => void
  onOpenEmployeeSelector: () => void
  selectedCount: number
  totalCount: number
}

export function WeekToolbar({
  weekDays, sector, pendingToSend, confirmed, rejected, draftCount,
  isPublishing, onPrev, onNext, onThisWeek, onSectorChange, onPublishWeek,
  onOpenEmployeeSelector, selectedCount, totalCount,
}: Props) {
  const desde = weekDays[0] ?? ''
  const hasta = weekDays[6] ?? ''

  return (
    <div className="gastro-plan-toolbar space-y-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SECTORES_GASTRONOMIA.map(item => (
            <button
              key={item.value}
              onClick={() => onSectorChange(item.value)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                sector === item.value
                  ? 'gastro-plan-sector-active'
                  : 'gastro-plan-sector'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onPrev}
            className="gastro-plan-icon-button rounded-lg border p-1.5"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onThisWeek}
            className="gastro-plan-date-button rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
          >
            {desde} – {hasta}
          </button>
          <button
            onClick={onNext}
            className="gastro-plan-icon-button rounded-lg border p-1.5"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="gastro-plan-status gastro-plan-status-pending rounded-full border px-2.5 py-1 text-xs font-semibold">
            {pendingToSend} pendientes
          </span>
          <span className="gastro-plan-status gastro-plan-status-confirmed rounded-full border px-2.5 py-1 text-xs font-semibold">
            {confirmed} confirmados
          </span>
          <span className="gastro-plan-status gastro-plan-status-rejected rounded-full border px-2.5 py-1 text-xs font-semibold">
            {rejected} no trabajan
          </span>
          {draftCount > 0 && (
            <span className="gastro-plan-status gastro-plan-status-draft rounded-full border px-2.5 py-1 text-xs font-semibold">
              {draftCount} sin guardar
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={onOpenEmployeeSelector}
            className="gastro-plan-button-secondary flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
          >
            <Users size={15} />
            Empleados{selectedCount > 0 ? ` (${selectedCount}/${totalCount})` : ''}
          </button>
          <button
            onClick={onPublishWeek}
            disabled={isPublishing || pendingToSend === 0}
            className="gastro-plan-button-primary flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Publicar semana
          </button>
        </div>
      </div>
    </div>
  )
}
