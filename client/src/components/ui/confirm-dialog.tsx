import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react'
import { Button } from './button'

type Variant = 'danger' | 'warning' | 'default'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

const variantConfig: Record<Variant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; btnVariant: 'destructive' | 'default' }> = {
  danger: { icon: Trash2, iconBg: 'bg-red-100', iconColor: 'text-red-600', btnVariant: 'destructive' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', btnVariant: 'default' },
  default: { icon: HelpCircle, iconBg: 'bg-primary/10', iconColor: 'text-primary', btnVariant: 'default' },
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...options, resolve })
    })
  }, [])

  const handleClose = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  useEffect(() => {
    if (!state) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [state])

  useEffect(() => {
    if (state && dialogRef.current) {
      const btn = dialogRef.current.querySelector<HTMLButtonElement>('[data-autofocus]')
      btn?.focus()
    }
  }, [state])

  const cfg = state ? variantConfig[state.variant ?? 'default'] : variantConfig.default
  const Icon = cfg.icon

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => handleClose(false)} />
          <div ref={dialogRef} className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full animate-slideUp">
            <div className="p-6">
              <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center mb-4`}>
                <Icon size={20} className={cfg.iconColor} />
              </div>
              <h3 className="font-heading font-semibold text-base text-gray-900">{state.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{state.message}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleClose(false)}
                data-autofocus
              >
                {state.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant={cfg.btnVariant}
                className="flex-1"
                onClick={() => handleClose(true)}
              >
                {state.confirmLabel ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
