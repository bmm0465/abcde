import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge, DefList, Notice } from '@/components/ui/primitives'
import { requireViewer } from '@/lib/auth/guards'
import { STATUS_LABELS } from '@/lib/auth/types'

export const metadata: Metadata = { title: '승인 대기' }

export default async function PendingPage() {
  const viewer = await requireViewer('/pending')
  const profile = viewer.profile

  if (profile && (profile.status === 'approved' || profile.role === 'admin')) redirect('/account')

  return (
    <AuthShell title="가입이 접수되었습니다" description="관리자가 확인한 뒤 도구 사용을 열어 드립니다.">
      <div className="mt-6 space-y-5">
        {profile?.status === 'suspended' ? (
          <Notice tone="warn">이 계정은 정지 상태입니다. 문의 화면으로 연락해 주세요.</Notice>
        ) : (
          <Notice tone="info">
            지금도 프로젝트 소개와 기록은 모두 읽을 수 있습니다. 승인되면 다음 로그인부터 도구가 열립니다.
          </Notice>
        )}

        <DefList
          items={[
            { term: '이메일', value: viewer.user.email ?? '—' },
            { term: '이름', value: profile?.display_name ?? '—' },
            { term: '소속', value: profile?.affiliation ?? '—' },
            {
              term: '상태',
              value: <Badge tone="warn">{profile ? STATUS_LABELS[profile.status] : '프로필 준비 중'}</Badge>,
            },
          ]}
        />

        <p className="text-sm text-muted">
          승인 여부는 이 화면이나 내 계정에서 확인합니다. 급하면 문의 화면으로 알려 주세요.
        </p>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" variant="primary">
            둘러보기
          </ButtonLink>
          <ButtonLink href="/account">내 계정</ButtonLink>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="quiet">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </AuthShell>
  )
}
