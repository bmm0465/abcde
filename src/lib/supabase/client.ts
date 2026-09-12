'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabasePublicEnv } from '@/lib/env'

/** 브라우저용 클라이언트. 세션은 쿠키에 있으므로 서버와 같은 사용자를 본다. */
export function createClient() {
  const env = supabasePublicEnv()
  if (!env) throw new Error('Supabase 환경 변수가 없습니다. .env.example 을 참고해 .env.local 을 만드세요.')
  return createBrowserClient(env.url, env.key)
}
