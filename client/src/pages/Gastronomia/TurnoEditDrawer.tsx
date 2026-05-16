import { CheckCircle2, Copy, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { statusClass, statusLabel, type DraftTurno } from './types'

type SavedTurno = {
  id?: number
  estado?: string
}

type Emp = {
  id: number
  nombre: string
  puesto?: string
  waId?: string
}

type Props = {
  open: boolean
  onClose: () => void
  emp: Emp | null
  fecha: string
  draft: DraftTurno | null
  onDraftChange: (patch: Partial<DraftTurno>) => void
  onSave: () => void
  onDelete: () => void
  onCopyToWeek: () => void
  isSaving: boolean
  isDeleting: boolean
  savedTurno?: SavedTurno
}

export function TurnoEditDrawer({
  open, onClose, emp, fecha, draft, onDraftChange,
  onSave, onDelete, onCopyToWeek, isSaving, isDeleting, savedTurno,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!open || !emp || !draft) return null

  const [year, month, day] = fecha.split('-').map(Number)
  const dateObj = new Date(year!, (month! - 1), day!)
  const dateLabel = dateObj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  const [entradaHora = '0', entradaMin = '0'] = draft.horaEntrada.split(':')
  const [salidaHora = '0', salidaMin = '0'] = draft.horaSalida.split(':')
  const durationMinutes = Math.max(0, (Number(salidaHora) * 60 + Number(salidaMin)) - (Number(entradaHora) * 60 + Number(entradaMin)))
  const durationHours = Math.floor(durationMinutes / 60)
  const durationRemainder = durationMinutes % 60
  const durationLabel = durationMinutes > 0
    ? durationRemainder > 0 ? `${durationHours}h ${durationRemainder}m` : `${durationHours}h`
    : 'Sin rango'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/55" onClick={handleClose} />
      <div className="gastro-plan-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-[370px] flex-col shadow-2xl">
        <div className="gastro-plan-drawer-header flex items-start justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{emp.nombre}</div>
            <div className="text-xs capitalize">{dateLabel}</div>
            {savedTurno?.estado && (
              <span
                className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(savedTurno.estado)}`}
              >
                {statusLabel(savedTurno.estado)}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="gastro-employee-icon-button rounded-lg p-1.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="gastro-plan-drawer-body flex-1 overflow-y-auto px-4 py-3">
          <label className="gastro-plan-toggle mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.trabaja}
              onChange={e => onDraftChange({ trabaja: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            Trabaja este día
          </label>

          <div className="gastro-plan-compact-metrics mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide">Turno</div>
              <div className="mt-1 text-sm font-semibold">{draft.horaEntrada} - {draft.horaSalida}</div>
            </div>
            <div className="rounded-xl border px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide">Duración</div>
              <div className="mt-1 text-sm font-semibold">{durationLabel}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="gastro-plan-label text-xs font-semibold">Entrada</span>
              <input
                type="time"
                value={draft.horaEntrada}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaEntrada: e.target.value })}
                className="gastro-plan-input w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
            <label className="space-y-1">
              <span className="gastro-plan-label text-xs font-semibold">Salida</span>
              <input
                type="time"
                value={draft.horaSalida}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaSalida: e.target.value })}
                className="gastro-plan-input w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
          </div>

          <div className="gastro-plan-inline-actions mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="gastro-plan-button-primary flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Save size={15} />
              Guardar
            </button>
            <button
              onClick={onCopyToWeek}
              className="gastro-plan-button-secondary flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold"
            >
              <Copy size={15} />
              Copiar semana
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            <label className="block space-y-1">
              <span className="gastro-plan-label text-xs font-semibold">Rol / Puesto</span>
              <input
                value={draft.puesto}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ puesto: e.target.value })}
                placeholder="Caja, cocina, salón…"
                className="gastro-plan-input w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>

            <label className="block space-y-1">
              <span className="gastro-plan-label text-xs font-semibold">Nota breve</span>
              <input
                value={draft.nota}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ nota: e.target.value })}
                placeholder="Indicaciones adicionales"
                className="gastro-plan-input w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
          </div>

          {savedTurno?.estado === 'confirmado' && (
            <div className="gastro-plan-alert gastro-plan-alert-success mt-3 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold">
              <CheckCircle2 size={15} />
              El empleado confirmó este turno
            </div>
          )}

          {!emp.waId && (
            <div className="gastro-plan-alert gastro-plan-alert-warning mt-3 rounded-xl border px-3 py-2 text-sm">
              Sin WhatsApp — se puede guardar pero no enviar mensaje.
            </div>
          )}
        </div>

        <div className="gastro-plan-drawer-footer space-y-2 border-t px-4 py-3">
          {confirmDelete ? (
            <div className="gastro-plan-alert gastro-plan-alert-error rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">
                ¿Borrar este turno planificado?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false) }}
                  disabled={isDeleting}
                  className="rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
                >
                  Sí, borrar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="gastro-plan-button-secondary rounded-xl border py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={!savedTurno?.id}
              className="gastro-plan-button-secondary flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold disabled:opacity-30"
            >
              <Trash2 size={14} />
              Borrar turno guardado
            </button>
          )}
        </div>
      </div>
    </>
  )
}
