/**
 * 환경 변수 접근. 값을 흩뿌리지 않고 한 곳에서 읽는다.
 * 브라우저에서도 import 될 수 있으므로 NEXT_PUBLIC_ 이 아닌 값은 여기서 읽지 않는다.
 */

export function supabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { url, key }
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicEnv() !== null
}

/** 절대 URL 이 필요한 곳(이메일 인증 링크, OG 태그)의 기준. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
