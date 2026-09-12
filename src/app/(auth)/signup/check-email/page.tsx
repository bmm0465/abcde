import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: '이메일 확인' }

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams
  return (
    <AuthShell title="받은 편지함을 확인하세요" description="인증 링크를 보냈습니다.">
      <div className="mt-6 space-y-3 text-sm text-muted">
        <p>
          {email ? <strong className="font-medium text-text">{email}</strong> : '적어 주신 주소'} 로 인증 메일을
          보냈습니다. 링크를 누르면 가입이 끝나고 승인 대기 화면으로 넘어갑니다.
        </p>
        <p>몇 분이 지나도 오지 않으면 스팸함을 보고, 그래도 없으면 다시 가입을 시도해 주세요.</p>
      </div>
      <div className="mt-6">
        <ButtonLink href="/login">로그인 화면으로</ButtonLink>
      </div>
    </AuthShell>
  )
}
