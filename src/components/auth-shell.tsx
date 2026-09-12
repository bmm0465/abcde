import Link from 'next/link'
import type { ReactNode } from 'react'
import { Tagline, Wordmark } from '@/components/ui/wordmark'
import { site } from '@/content/site'

export const AUTH_FIELD =
  'h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-base text-text ' +
  'placeholder:text-faint hover:border-muted focus:border-accent focus:outline-none'

export const AUTH_BUTTON = 'h-10 w-full'

/** 로그인·가입·재설정 화면의 공통 틀. 가운데 한 열, 폭 24rem. 위에 제호. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-10 inline-flex flex-col gap-1" aria-label={`${site.name} 홈`}>
        <Wordmark size="lg" />
        <Tagline className="text-sm text-muted" />
      </Link>
      <h1 className="text-display tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      {children}
      {footer && <div className="mt-8 border-t border-line-strong pt-5">{footer}</div>}
    </main>
  )
}
