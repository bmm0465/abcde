import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabasePublicEnv } from '@/lib/env'
import type { Profile } from '@/lib/auth/types'

export const PROFILE_COLUMNS =
  'id, email, display_name, role, status, affiliation, purpose, monthly_budget_usd, approved_at, created_at'

/**
 * 서버 컴포넌트·서버 액션·라우트 핸들러용 클라이언트. 사용자 세션으로 동작하므로 RLS 가 적용된다.
 * 환경 변수가 없으면 null — 화면은 "미설정" 상태로 그려진다.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const env = supabasePublicEnv()
  if (!env) return null
  const cookieStore = await cookies()

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // 서버 컴포넌트에서 호출된 경우. src/proxy.ts 가 세션을 갱신하므로 무시해도 된다.
        }
      },
    },
  })
}

export interface Viewer {
  user: User
  profile: Profile | null
  supabase: SupabaseClient
}

/**
 * 로그인 사용자 + 프로필. 미로그인(또는 미설정)이면 null.
 * getUser() 는 Auth 서버에 토큰을 검증한다 — 쿠키만 믿지 않는다.
 */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let { data: profile } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()

  // 가입 트리거가 실패했거나 트리거 도입 전 계정이면 프로필이 없다. 스스로 복구한다.
  if (!profile) {
    await supabase.rpc('ensure_profile')
    const retry = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
    profile = retry.data
  }

  return { user, profile: (profile as Profile | null) ?? null, supabase }
}

/** 사용자가 앱 단위로 열어 받은 접근 목록(app_access.app_slug). */
export async function getAppAccess(viewer: Viewer): Promise<string[]> {
  const { data } = await viewer.supabase.from('app_access').select('app_slug').eq('user_id', viewer.user.id)
  return (data ?? []).map((r) => r.app_slug as string)
}
