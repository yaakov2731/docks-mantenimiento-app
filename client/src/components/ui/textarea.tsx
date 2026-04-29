import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import React from 'react'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={twMerge(clsx('input min-h-[96px] resize-y px-3.5 py-2.5 text-[13px]', className))}
      {...props}
    />
  )
}
