import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * 폼 규격 — 기록지의 칸.
 * - 라벨은 항상 필드 위. placeholder 를 라벨 대용으로 쓰지 않는다.
 * - 필수 표시(*) 대신 선택 항목에 "(선택)" 을 붙인다.
 * - 도움말은 필드 아래 12px 한 줄.
 */

export function Field({
  id,
  label,
  hint,
  optional,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  optional?: boolean
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">(선택)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-danger">{error}</p>
      ) : hint ? (
        <p className="text-caption text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

export const controlClass =
  'w-full rounded-sm border border-line-strong bg-surface px-3 text-base text-text ' +
  'placeholder:text-faint transition-colors duration-100 ease-out ' +
  'hover:border-muted focus:border-accent focus:outline-none ' +
  'disabled:bg-sunken disabled:text-faint disabled:border-line'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn(controlClass, 'h-9', className)} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn(controlClass, 'py-2 leading-[1.7] resize-y', className)} />
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select {...props} className={cn(controlClass, 'h-9 pr-8', className)}>
      {children}
    </select>
  )
}

export function Checkbox({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cn('size-4 rounded-sm border border-line-strong accent-accent', className)}
    />
  )
}
