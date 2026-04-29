import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(clsx('badge', className))}
      {...props}
    />
  )
}
