import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type SelectContextValue = {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  selectedLabel: string
  setSelectedLabel: (label: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState('')

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, setSelectedLabel }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext)
  return (
    <button
      type="button"
      className={twMerge(clsx(
        'input flex min-h-[39px] w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px]',
        className
      ))}
      onClick={() => context?.setOpen(!context.open)}
    >
      {children}
      <span className="ml-2" style={{ color: 'var(--text-3)' }}>▾</span>
    </button>
  )
}

export function SelectValue({ placeholder = 'Seleccionar...' }: { placeholder?: string }) {
  const context = React.useContext(SelectContext)
  return <span>{context?.selectedLabel || context?.value || placeholder}</span>
}

export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(SelectContext)
  if (!context?.open) return null

  return (
    <div
      className={twMerge(clsx(
        'absolute z-50 mt-1 w-full overflow-hidden rounded-xl py-1',
        className
      ))}
      style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-card-strong)' }}
    >
      {children}
    </div>
  )
}

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const context = React.useContext(SelectContext)
  const active = context?.value === value

  React.useEffect(() => {
    if (active && typeof children === 'string') {
      context?.setSelectedLabel(children)
    }
  }, [active, children, context])

  return (
    <button
      type="button"
      className={twMerge(clsx('block w-full px-3.5 py-2 text-left text-[13px] transition-colors', className))}
      style={{
        background: active ? 'oklch(0.595 0.210 264 / 0.10)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-1)',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      onClick={() => {
        context?.onValueChange(value)
        if (typeof children === 'string') context?.setSelectedLabel(children)
        context?.setOpen(false)
      }}
    >
      {children}
    </button>
  )
}
