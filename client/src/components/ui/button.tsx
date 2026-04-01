import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  default:     'bg-primary text-white shadow-[0_4px_0_0_#075f7a] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#075f7a] active:translate-y-1 active:shadow-[0_1px_0_0_#075f7a]',
  destructive: 'bg-danger text-white shadow-[0_4px_0_0_#b91c1c] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#b91c1c] active:translate-y-1 active:shadow-[0_1px_0_0_#b91c1c]',
  outline:     'bg-white text-gray-700 border border-gray-300 shadow-[0_4px_0_0_#94a3b8] hover:-translate-y-0.5 active:translate-y-1',
  secondary:   'bg-sidebar-bg text-white shadow-[0_4px_0_0_#111827] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#111827] active:translate-y-1',
  ghost:       'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  success:     'bg-success text-white shadow-[0_4px_0_0_#16a34a] hover:-translate-y-0.5 active:translate-y-1',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'default', size = 'md', loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={twMerge(clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        variants[variant],
        sizes[size],
        className
      ))}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
