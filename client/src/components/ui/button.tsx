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
  default:     'bg-primary text-white shadow-md hover:bg-primary-dark hover:shadow-lg active:shadow-sm transition-all',
  destructive: 'bg-danger text-white shadow-md hover:bg-red-700 hover:shadow-lg active:shadow-sm transition-all',
  outline:     'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all',
  secondary:   'bg-secondary text-white shadow-md hover:bg-purple-700 hover:shadow-lg active:shadow-sm transition-all',
  ghost:       'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-all',
  success:     'bg-success text-white shadow-md hover:bg-emerald-700 hover:shadow-lg active:shadow-sm transition-all',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
}

export function Button({ variant = 'default', size = 'md', loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={twMerge(clsx(
        'inline-flex items-center justify-center gap-2 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
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
