import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/auth/guards'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

/**
 * 이메일 인증·비밀번호 재설정 링크가 돌아오는 곳.
 * PKCE(code) 와 토큰 해시(token_hash + type) 두 형식을 모두 받는다.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = safeNext(params.get('next'), '/pending')
  const base = siteUrl()

  const supabase = await createClient()
  if (supabase) {
    const code = params.get('code')
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(new URL(next, base))
    } else if (tokenHash && type && (OTP_TYPES as string[]).includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      if (!error) return NextResponse.redirect(new URL(next, base))
    }
  }

  const message = '인증 링크가 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.'
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, base))
}
