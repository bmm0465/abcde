'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  display_name: z.string().trim().min(1, '이름을 적어 주세요.').max(40, '이름은 40자까지입니다.'),
  email: z.email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상입니다.').max(72, '비밀번호는 72자까지입니다.'),
  affiliation: z.string().trim().max(80, '소속은 80자까지입니다.').optional(),
  purpose: z.string().trim().max(300, '사용 목적은 300자까지입니다.').optional(),
})

function toSignup(error: string): never {
  redirect(`/signup?error=${encodeURIComponent(error)}`)
}

export async function signUp(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    affiliation: formData.get('affiliation') || undefined,
    purpose: formData.get('purpose') || undefined,
  })
  if (!parsed.success) toSignup(parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.')

  const supabase = await createClient()
  if (!supabase) toSignup('인증이 아직 설정되지 않았습니다.')

  const { display_name, email, password, affiliation, purpose } = parsed.data
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 가입 트리거(handle_new_user)가 이 메타데이터로 프로필을 만든다.
      data: { display_name, affiliation: affiliation ?? null, purpose: purpose ?? null },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent('/pending')}`,
    },
  })

  if (error) {
    if (error.code === 'weak_password') toSignup('더 긴 비밀번호를 써 주세요.')
    if (error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') {
      toSignup('시도가 너무 잦습니다. 잠시 후 다시 해 주세요.')
    }
    toSignup('가입하지 못했습니다. 잠시 후 다시 해 주세요.')
  }

  // 이메일 확인이 꺼져 있으면 세션이 바로 생긴다.
  if (data.session) redirect('/pending')
  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`)
}
