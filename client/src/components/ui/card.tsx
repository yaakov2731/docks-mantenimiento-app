import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type DivProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={twMerge(clsx('card overflow-hidden', className))}
      {...props}
    />
  )
}

export function CardHeader({ className, style, ...props }: DivProps) {
  return (
    <div
      className={twMerge(clsx('px-5 py-4', className))}
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--gray-50)', ...style }}
      {...props}
    />
  )
}

export function CardTitle({ className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={twMerge(clsx('font-heading text-base font-semibold', className))}
      style={{ color: 'var(--text-1)', ...style }}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: DivProps) {
  return (
    <div
      className={twMerge(clsx('p-5', className))}
      {...props}
    />
  )
}
