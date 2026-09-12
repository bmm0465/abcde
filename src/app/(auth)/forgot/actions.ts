'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = z.email().safeParse(formData.get('email'))
  if (!parsed.success) redirect(`/forgot?error=${encodeURIComponent('이메일 형식을 확인해 주세요.')}`)

  const supabase = await createClient()
  if (supabase) {
    // 존재하지 않는 주소여도 같은 화면을 보여 준다 — 가입 여부를 밖에서 알 수 없게.
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent('/account/password')}`,
    })
  }
  redirect('/forgot?sent=1')
}
