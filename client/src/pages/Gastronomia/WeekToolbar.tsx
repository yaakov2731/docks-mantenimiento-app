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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SECTORES_GASTRONOMIA.map(item => (
            <button
              key={item.value}
              onClick={() => onSectorChange(item.value)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                sector === item.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onPrev}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onThisWeek}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {desde} – {hasta}
          </button>
          <button
            onClick={onNext}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            {pendingToSend} pendientes
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {confirmed} confirmados
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            {rejected} no trabajan
          </span>
          {draftCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {draftCount} sin guardar
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={onOpenEmployeeSelector}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Users size={15} />
            Empleados{selectedCount > 0 ? ` (${selectedCount}/${totalCount})` : ''}
          </button>
          <button
            onClick={onPublishWeek}
            disabled={isPublishing || pendingToSend === 0}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Publicar semana
          </button>
        </div>
      </div>
    </div>
  )
}
