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
  default:     'bg-primary text-[oklch(0.068_0.008_238)] hover:bg-primary-dark transition-all',
  destructive: 'bg-danger text-white hover:opacity-80 transition-all',
  outline:     'bg-transparent text-gray-300 border border-[oklch(0.255_0.007_238)] hover:border-primary hover:text-primary transition-all',
  secondary:   'bg-transparent text-gray-300 border border-[oklch(0.255_0.007_238)] hover:border-primary hover:text-primary transition-all',
  ghost:       'bg-transparent text-gray-500 hover:bg-[oklch(0.155_0.007_238)] hover:text-gray-200 transition-all',
  success:     'bg-success text-[oklch(0.068_0.008_238)] hover:opacity-80 transition-all',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-[11px]',
  lg: 'px-5 py-2.5 text-[12px]',
}

export function Button({ variant = 'default', size = 'md', loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={twMerge(clsx(
        'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        'uppercase tracking-wider',
        'rounded-sm',
        'font-mono',
        variants[variant],
        sizes[size],
        className
      ))}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
