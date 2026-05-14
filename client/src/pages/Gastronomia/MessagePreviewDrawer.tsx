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
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="font-semibold text-slate-900">
              Vista previa — Envío por WhatsApp
            </div>
            <div className="text-xs text-slate-500">
              {withWa.length} recibirán mensaje · {withoutWa.length} sin WhatsApp
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {items.map(item => {
            const label = formatDayLabel(item.fecha)
            return (
              <div key={item.turnoId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{item.nombre}</div>
                  {item.waId ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      WhatsApp ✓
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Sin WA
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {label.long} {label.number} · {item.horaEntrada}–{item.horaSalida}
                  {item.puesto ? ` · ${item.puesto}` : ''}
                </div>
                {item.nota && (
                  <div className="mt-0.5 text-xs text-slate-400">{item.nota}</div>
                )}
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No hay turnos pendientes para enviar.
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          {withoutWa.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {withoutWa.length} empleado(s) sin WhatsApp se guardan pero no reciben mensaje.
            </div>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading || withWa.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <MessageSquareText size={15} />
            Enviar {withWa.length} mensaje(s)
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
