import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Size = 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm border font-medium ' +
  'transition-colors duration-100 ease-out whitespace-nowrap ' +
  'disabled:opacity-45 disabled:pointer-events-none'

/** 인쇄물의 버튼: 잉크로 채우거나(주 동작), 잉크로 두르거나(보조), 글자만(조용히). */
const variants: Record<Variant, string> = {
  primary: 'border-text bg-text text-bg hover:border-accent hover:bg-accent hover:text-on-accent',
  secondary: 'border-line-strong bg-transparent text-text hover:bg-sunken',
  quiet: 'border-transparent text-muted hover:bg-sunken hover:text-text',
  danger: 'border-transparent text-danger hover:bg-danger-weak',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

/**
 * 기본 type 은 'button'. 브라우저 기본값 'submit' 은 <form> 안의 모든 버튼을 제출 버튼으로 만든다.
 * 제출 버튼은 반드시 type="submit" 을 명시한다.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button type={type} {...props} className={buttonClass(variant, size, className)} />
}

/** 앱 안의 이동. next/link 를 쓴다. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />
}

/** 바깥으로 나가는 링크. */
export function ExternalButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'a'> & { variant?: Variant; size?: Size }) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...props} className={buttonClass(variant, size, className)} />
  )
}
