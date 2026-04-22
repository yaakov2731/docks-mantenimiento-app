import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: React.ReactElement
}) {
  const context = React.useContext(DialogContext)
  if (!context) return children

  if (asChild) {
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent) => {
        children.props.onClick?.(event)
        context.onOpenChange(true)
      },
    })
  }

  return (
    <button type="button" onClick={() => context.onOpenChange(true)}>
      {children}
    </button>
  )
}

export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext)
  if (!context?.open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={() => context.onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={twMerge(clsx(
          'max-h-[90vh] w-full overflow-y-auto rounded-t-[24px] p-5 md:max-w-lg md:rounded-[24px]',
          className
        ))}
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-modal)' }}
        onClick={event => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(clsx('mb-4 pb-3', className))}
      style={{ borderBottom: '1px solid var(--border)' }}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={twMerge(clsx('font-heading text-lg font-bold', className))}
      style={{ color: 'var(--text-1)' }}
      {...props}
    />
  )
}
