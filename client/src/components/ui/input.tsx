import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={twMerge(clsx('input px-3.5 py-2.5 text-[13px]', className))}
      {...props}
    />
  )
}
