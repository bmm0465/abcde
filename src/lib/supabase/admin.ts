import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * service_role 클라이언트. RLS 를 우회한다.
 *
 * ⚠ 지금 이 프로젝트의 웹 앱은 이 함수를 부르지 않는다. 부르지 말 것.
 *
 * Supabase 프로젝트를 AIDAPEL 파일럿(초등학생 이름·음성 녹음)과 함께 쓰고 있고,
 * service_role 키는 프로젝트 단위라 하나가 새면 그 데이터까지 전부 열린다.
 * 그래서 런타임에 필요했던 사용량 기록과 속도 제한은 security definer 함수로 옮겼고
 * (supabase/migrations/20260913010000_no_service_role_at_runtime.sql),
 * 배포 환경에는 SUPABASE_SERVICE_ROLE_KEY 를 넣지 않는다.
 *
 * 남겨 둔 이유는 로컬 스크립트(scripts/promote-admin.mjs, scripts/aieewa-seed-corpus.mjs)가
 * 같은 패턴을 쓰기 때문이다. 웹 코드에서 이걸 다시 쓰려면 왜 security definer 함수로
 * 안 되는지부터 적을 것.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
