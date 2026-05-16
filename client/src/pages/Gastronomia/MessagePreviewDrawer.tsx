import { MessageSquareText, X } from 'lucide-react'
import { formatDayLabel } from './types'

export type PreviewItem = {
  turnoId: number
  nombre: string
  waId?: string
  fecha: string
  horaEntrada: string
  horaSalida: string
  puesto?: string
  nota?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  items: PreviewItem[]
}

export function MessagePreviewDrawer({ open, onClose, onConfirm, isLoading, items }: Props) {
  if (!open) return null

  const withWa = items.filter(i => i.waId)
  const withoutWa = items.filter(i => !i.waId)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/55" onClick={onClose} />
      <div className="gastro-plan-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-2xl">
        <div className="gastro-plan-drawer-header flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold">
              Vista previa — Envío por WhatsApp
            </div>
            <div className="text-xs">
              {withWa.length} recibirán mensaje · {withoutWa.length} sin WhatsApp
            </div>
          </div>
          <button
            onClick={onClose}
            className="gastro-employee-icon-button rounded-lg p-1.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="gastro-plan-preview-list flex-1 overflow-y-auto px-3 py-3">
          {items.map(item => {
            const label = formatDayLabel(item.fecha)
            return (
              <div key={item.turnoId} className="gastro-plan-preview-card rounded-2xl border px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{item.nombre}</div>
                  {item.waId ? (
                    <span className="gastro-plan-mini-badge gastro-plan-mini-confirmed rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      WhatsApp ✓
                    </span>
                  ) : (
                    <span className="gastro-plan-mini-badge gastro-plan-mini-draft rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      Sin WA
                    </span>
                  )}
                </div>
                <div className="gastro-plan-cell-muted mt-1 text-xs">
                  {label.long} {label.number} · {item.horaEntrada}–{item.horaSalida}
                  {item.puesto ? ` · ${item.puesto}` : ''}
                </div>
                {item.nota && (
                  <div className="gastro-plan-cell-muted mt-0.5 text-xs">{item.nota}</div>
                )}
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="gastro-plan-cell-muted p-8 text-center text-sm">
              No hay turnos pendientes para enviar.
            </div>
          )}
        </div>

        <div className="gastro-plan-drawer-footer space-y-2 border-t px-4 py-3">
          {withoutWa.length > 0 && (
            <div className="gastro-plan-alert gastro-plan-alert-warning rounded-xl border px-3 py-2 text-xs">
              {withoutWa.length} empleado(s) sin WhatsApp se guardan pero no reciben mensaje.
            </div>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading || withWa.length === 0}
            className="gastro-plan-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Enviar {withWa.length} mensaje(s)
          </button>
          <button
            onClick={onClose}
            className="gastro-plan-button-secondary w-full rounded-xl border py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
