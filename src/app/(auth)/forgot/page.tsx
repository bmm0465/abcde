import type { Metadata } from 'next'
import Link from 'next/link'
import { AUTH_BUTTON, AUTH_FIELD, AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { requestPasswordReset } from './actions'

export const metadata: Metadata = { title: '비밀번호 재설정' }

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams

  return (
    <AuthShell
      title="비밀번호 재설정"
      description="가입한 이메일로 재설정 링크를 보냅니다."
      footer={
        <p className="text-caption text-muted">
          <Link href="/login" className="text-accent hover:underline">
            로그인 화면으로
          </Link>
        </p>
      }
    >
      {sent ? (
        <Notice tone="ok" className="mt-6">
          가입된 주소라면 재설정 링크를 보냈습니다. 받은 편지함과 스팸함을 확인하세요.
        </Notice>
      ) : (
        <>
          {error && (
            <div className="mt-5">
              <ErrorState message={error} />
            </div>
          )}
          <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted">
                이메일
              </label>
              <input id="email" name="email" type="email" required autoFocus autoComplete="email" className={AUTH_FIELD} />
            </div>
            <Button type="submit" variant="primary" className={AUTH_BUTTON}>
              링크 보내기
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
