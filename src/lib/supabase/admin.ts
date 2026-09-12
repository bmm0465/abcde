import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * service_role 클라이언트. RLS 를 우회한다.
 * 관리자 서버 액션, 사용량 기록, 시드 스크립트에서만 쓴다.
 * 절대 클라이언트 번들에 들어가면 안 된다 — 'server-only' 가 import 시점에 막는다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
