import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AUTH_BUTTON, AUTH_FIELD, AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { isSupabaseConfigured } from '@/lib/env'
import { getViewer } from '@/lib/supabase/server'
import { signUp } from './actions'

export const metadata: Metadata = { title: '가입' }

const FIELD_LABEL = 'text-sm font-medium text-muted'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  const configured = isSupabaseConfigured()
  if (configured) {
    const viewer = await getViewer()
    if (viewer) redirect('/account')
  }

  return (
    <AuthShell
      title="가입"
      description="가입하면 바로 둘러볼 수 있고, 관리자 승인 후에 AI 도구를 쓸 수 있습니다."
      footer={
        <div className="space-y-2 text-caption text-muted">
          <p>
            이미 계정이 있으면{' '}
            <Link href="/login" className="text-accent hover:underline">
              로그인
            </Link>
            하세요.
          </p>
          <p>
            가입 시{' '}
            <Link href="/privacy" className="text-accent hover:underline">
              개인정보처리방침
            </Link>
            에 동의한 것으로 봅니다. 학생 계정은 여기서 만들지 않습니다.
          </p>
        </div>
      }
    >
      {!configured && (
        <Notice tone="warn" className="mt-5">
          Supabase 환경 변수가 없어 가입할 수 없습니다.
        </Notice>
      )}
      {error && (
        <div className="mt-5">
          <ErrorState message={error} />
        </div>
      )}

      <form action={signUp} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display_name" className={FIELD_LABEL}>
            이름
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            maxLength={40}
            autoComplete="name"
            className={AUTH_FIELD}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={FIELD_LABEL}>
            이메일
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className={AUTH_FIELD} />
          <p className="text-caption text-faint">인증 링크를 보냅니다. 학교 메일도 됩니다.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={FIELD_LABEL}>
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className={AUTH_FIELD}
          />
          <p className="text-caption text-faint">8자 이상.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="affiliation" className={FIELD_LABEL}>
            소속 <span className="font-normal text-faint">(선택)</span>
          </label>
          <input id="affiliation" name="affiliation" type="text" maxLength={80} autoComplete="organization" className={AUTH_FIELD} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="purpose" className={FIELD_LABEL}>
            사용 목적 <span className="font-normal text-faint">(선택)</span>
          </label>
          <textarea
            id="purpose"
            name="purpose"
            rows={3}
            maxLength={300}
            className={`${AUTH_FIELD} h-auto py-2 leading-[1.7]`}
          />
          <p className="text-caption text-faint">어떤 수업·연구에 쓰려는지 적으면 승인이 빠릅니다.</p>
        </div>

        <Button type="submit" variant="primary" className={AUTH_BUTTON} disabled={!configured}>
          가입
        </Button>
      </form>
    </AuthShell>
  )
}
