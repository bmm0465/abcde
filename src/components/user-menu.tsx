import Link from 'next/link'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { ROLE_LABELS } from '@/lib/auth/types'
import { isSupabaseConfigured } from '@/lib/env'
import { getViewer } from '@/lib/supabase/server'

/**
 * 상단 바 오른쪽. 세션을 읽으므로(cookies) 이 부분만 Suspense 안에서 나중에 그려진다.
 */
export async function UserMenu() {
  if (!isSupabaseConfigured()) {
    return (
      <span className="text-caption text-faint" title="NEXT_PUBLIC_SUPABASE_URL 이 없습니다">
        인증 미설정
      </span>
    )
  }

  const viewer = await getViewer()

  if (!viewer) {
    return (
      <div className="flex items-center gap-1">
        <ButtonLink href="/login" variant="quiet" size="sm">
          로그인
        </ButtonLink>
        <ButtonLink href="/signup" variant="secondary" size="sm">
          가입
        </ButtonLink>
      </div>
    )
  }

  const profile = viewer.profile
  const name = profile?.display_name ?? viewer.user.email ?? '사용자'
  const pending = profile?.status === 'pending'

  return (
    <div className="flex items-center gap-2">
      <Link href="/account" className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-sunken">
        <span className="max-w-40 truncate text-sm">{name}</span>
        {profile && (
          <Badge tone={pending ? 'warn' : profile.role === 'admin' ? 'accent' : 'neutral'}>
            {pending ? '승인 대기' : ROLE_LABELS[profile.role]}
          </Badge>
        )}
      </Link>
      {profile?.role === 'admin' && (
        <ButtonLink href="/admin" variant="quiet" size="sm">
          관리
        </ButtonLink>
      )}
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="quiet" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  )
}
