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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">{emp.nombre}</div>
            <div className="text-xs capitalize text-slate-500">{dateLabel}</div>
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={draft.trabaja}
              onChange={e => onDraftChange({ trabaja: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Trabaja este día
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Entrada</span>
              <input
                type="time"
                value={draft.horaEntrada}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaEntrada: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Salida</span>
              <input
                type="time"
                value={draft.horaSalida}
                disabled={!draft.trabaja}
                onChange={e => onDraftChange({ horaSalida: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Rol / Puesto</span>
            <input
              value={draft.puesto}
              disabled={!draft.trabaja}
              onChange={e => onDraftChange({ puesto: e.target.value })}
              placeholder="Caja, cocina, salón…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Nota</span>
            <input
              value={draft.nota}
              disabled={!draft.trabaja}
              onChange={e => onDraftChange({ nota: e.target.value })}
              placeholder="Indicaciones adicionales"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            />
          </label>

          {savedTurno?.estado === 'confirmado' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={15} />
              El empleado confirmó este turno
            </div>
          )}

          {!emp.waId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Sin WhatsApp — se puede guardar pero no enviar mensaje.
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Save size={15} />
              Guardar
            </button>
            <button
              onClick={onCopyToWeek}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Copy size={15} />
              Copiar semana
            </button>
          </div>

          {confirmDelete ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <div className="mb-2 text-sm font-semibold text-rose-800">
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
                  className="rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={!savedTurno?.id}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-30"
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
