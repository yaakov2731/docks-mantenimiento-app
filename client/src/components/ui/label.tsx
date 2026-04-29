import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={twMerge(clsx('mb-1.5 block text-[12.5px] font-medium text-slate-700', className))}
      {...props}
    />
  )
}
