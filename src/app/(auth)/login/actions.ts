'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { safeNext } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1).max(72),
  next: z.string().optional(),
})

function toLogin(error: string, next: string): never {
  redirect(`/login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(next)}`)
}

function messageFor(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'invalid_credentials':
      return '이메일 또는 비밀번호가 맞지 않습니다.'
    case 'email_not_confirmed':
      return '이메일 인증이 아직 안 됐습니다. 받은 편지함의 인증 링크를 눌러 주세요.'
    case 'over_request_rate_limit':
      return '시도가 너무 잦습니다. 잠시 후 다시 해 주세요.'
    default:
      return fallback
  }
}

export async function signIn(formData: FormData): Promise<void> {
  const next = safeNext(formData.get('next'))
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  })
  if (!parsed.success) toLogin('이메일과 비밀번호를 확인해 주세요.', next)

  const supabase = await createClient()
  if (!supabase) toLogin('인증이 아직 설정되지 않았습니다.', next)

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) toLogin(messageFor(error.code, '로그인하지 못했습니다. 잠시 후 다시 해 주세요.'), next)

  redirect(next)
}
