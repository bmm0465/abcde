// 관리자 지정. 사용법: npm run admin:promote -- you@example.com
// - hub_admin_emails 에 넣는다 → 이 주소로 가입하면 즉시 admin/approved.
// - 이미 가입한 계정이면 지금 바로 승격한다.
// .env.local 의 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 쓴다(node --env-file).

import { createClient } from '@supabase/supabase-js'

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email || !email.includes('@')) {
  console.error('사용법: npm run admin:promote -- you@example.com')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 있어야 합니다.')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { error: upsertError } = await sb.from('hub_admin_emails').upsert({ email })
if (upsertError) {
  console.error('hub_admin_emails 에 넣지 못했습니다:', upsertError.message)
  process.exit(1)
}
console.log(`✓ ${email} 을(를) 관리자 목록에 넣었습니다. 이 주소로 가입하면 즉시 관리자가 됩니다.`)

const { data: profile } = await sb.from('profiles').select('id, role, status').eq('email', email).maybeSingle()
if (profile) {
  const { error } = await sb
    .from('profiles')
    .update({ role: 'admin', status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', profile.id)
  if (error) {
    console.error('기존 계정을 승격하지 못했습니다:', error.message)
    process.exit(1)
  }
  console.log(`✓ 이미 가입된 계정을 관리자로 승격했습니다. (이전: ${profile.role}/${profile.status})`)
} else {
  console.log('· 아직 가입된 계정이 없습니다. 가입하면 자동으로 관리자가 됩니다.')
}
