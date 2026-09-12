import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AUTH_BUTTON, AUTH_FIELD, AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { safeNext } from '@/lib/auth/guards'
import { isSupabaseConfigured } from '@/lib/env'
import { getViewer } from '@/lib/supabase/server'
import { signIn } from './actions'

export const metadata: Metadata = { title: '로그인' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; notice?: string }>
}) {
  const { error, next: rawNext, notice } = await searchParams
  const next = safeNext(rawNext)

  const configured = isSupabaseConfigured()
  if (configured) {
    const viewer = await getViewer()
    if (viewer) redirect(next)
  }

  return (
    <AuthShell
      title="로그인"
      description="승인된 계정으로 도구를 씁니다. 소개와 기록은 로그인 없이 읽을 수 있습니다."
      footer={
        <p className="text-caption text-muted">
          계정이 없으면{' '}
          <Link href="/signup" className="text-accent hover:underline">
            가입
          </Link>
          하세요. 학생 계정은 담당 교사가 만들어 나눠 줍니다.
        </p>
      }
    >
      {!configured && (
        <Notice tone="warn" className="mt-5">
          Supabase 환경 변수가 없어 로그인할 수 없습니다. docs/01-실행-가이드.md 를 따라 설정하세요.
        </Notice>
      )}
      {notice && (
        <Notice tone="ok" className="mt-5">
          {notice}
        </Notice>
      )}
      {error && (
        <div className="mt-5">
          <ErrorState message={error} />
        </div>
      )}

      <form action={signIn} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-muted">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            className={AUTH_FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-muted">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={AUTH_FIELD}
          />
        </div>

        <Button type="submit" variant="primary" className={AUTH_BUTTON} disabled={!configured}>
          로그인
        </Button>

        <p className="text-center text-caption">
          <Link href="/forgot" className="text-muted hover:text-accent hover:underline">
            비밀번호를 잊었어요
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
