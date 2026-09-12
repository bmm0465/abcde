import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// ── 배지: 도장처럼. 모노 · 대문자 · 1px 테두리. 아이콘 없음 ─────
export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'mark'

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong text-muted',
  ok: 'border-ok/40 text-ok bg-ok-weak',
  warn: 'border-warn/40 text-warn bg-warn-weak',
  danger: 'border-danger/40 text-danger bg-danger-weak',
  info: 'border-info/40 text-info bg-info-weak',
  accent: 'border-accent/40 text-accent bg-accent-weak',
  mark: 'border-mark/40 text-mark bg-mark-weak',
}

export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-[3px] font-mono text-[0.6875rem] leading-none tracking-wide uppercase',
        tones[tone],
        className,
      )}
    />
  )
}

// ── 페이지 구조 ─────────────────────────────────────────────

/** 화면 제목. 위에 모노 라벨, 명조 제목, 아래에 굵은 괘선 하나. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 pb-5 rule-b sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover">
            <span aria-hidden="true">←</span>
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="label-mono mb-2 text-faint">{eyebrow}</p>}
        <h1 className="text-title tracking-tight">{title}</h1>
        {description && <p className="mt-3 max-w-prose text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** 구획. 번호가 있으면 학술지 절(section)처럼 "01" 을 앞에 단다. */
export function Section({
  number,
  title,
  aside,
  children,
  className,
}: {
  number?: string
  title?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-12', className)}>
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-4 pb-2 hairline-b">
          <h2 className="flex items-baseline gap-3 text-h2 tracking-snug">
            {number && <span className="font-mono text-sm font-normal text-mark tracking-wide">{number}</span>}
            {title}
          </h2>
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** 구획. 카드가 아니라 판(panel) — 그림자 없음, 1px 선. */
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('rounded-sm border border-line-strong bg-surface', className)} />
}

// ── 표: 학술지 조판. 위에 굵은 선, 머리 아래 선, 행 사이 가는 선. 세로선 없음 ──

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table {...props} className={cn('w-full border-collapse text-sm rule-t', className)} />
    </div>
  )
}

export function Th({ className, numeric, ...props }: ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      {...props}
      className={cn(
        'label-mono border-b border-line-strong px-3 py-2 text-left font-medium text-muted',
        numeric && 'text-right',
        className,
      )}
    />
  )
}

export function Td({ className, numeric, ...props }: ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      {...props}
      className={cn('border-b border-line px-3 py-2.5 align-top', numeric && 'text-right font-mono tabular-nums', className)}
    />
  )
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return <tr {...props} className={cn('hover:bg-sunken/50', className)} />
}

// ── 상태: 일러스트·이모지 없음. 1줄 설명 + 다음 행동 1개 ─────────

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-5 py-8 text-center">
      <p className="text-base text-muted">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, code }: { message: string; code?: string }) {
  return (
    <div role="alert" className="border-l-[3px] border-danger bg-danger-weak px-4 py-3">
      <p className="text-base text-danger">{message}</p>
      {code && <p className="mt-1 font-mono text-caption text-danger/70">{code}</p>}
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'ok' | 'warn'
  children: ReactNode
  className?: string
}) {
  const styles = {
    info: 'border-info bg-info-weak text-info',
    ok: 'border-ok bg-ok-weak text-ok',
    warn: 'border-warn bg-warn-weak text-warn',
  }
  return (
    <div role="status" className={cn('border-l-[3px] px-4 py-3 text-sm', styles[tone], className)}>
      {children}
    </div>
  )
}

/** 스켈레톤 shimmer 금지. 실제 행 높이의 흐린 플레이스홀더. */
export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rule-t">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 border-b border-line bg-sunken/40" />
      ))}
    </div>
  )
}

/** 정의형 데이터 나열. 항목명은 모노 라벨. */
export function DefList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-5 gap-y-2.5 text-sm">
      {items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="label-mono pt-0.5 text-faint">{it.term}</dt>
          <dd className="text-text">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
