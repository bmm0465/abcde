import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublicEnv } from '@/lib/env'

/**
 * 요청이 화면에 닿기 전에 하는 세 가지.
 *
 * 1. CSP nonce 생성 — 요청마다 새 값. Next 가 자기 스크립트에 자동으로 붙인다.
 * 2. Supabase 세션 갱신 — 만료된 토큰을 새로 받아 쿠키에 되돌려 쓴다.
 * 3. 낙관적 접근 통제 — 로그인 없이 보호 경로에 오면 /login 으로 보낸다.
 *
 * 여기서는 쿠키만 본다. 역할·승인 상태 같은 DB 판단은 각 화면과 서버 액션에서 한다.
 * 최종 방어선은 RLS 다. (Next 16 인증 가이드 "Optimistic checks with Proxy")
 */

const PROTECTED_PREFIXES = ['/admin', '/account', '/pending', '/aidapel', '/aieewa']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development'
  const directives = [
    `default-src 'self'`,
    // strict-dynamic: nonce 가 붙은 스크립트가 불러오는 스크립트만 허용한다.
    // 개발 모드의 unsafe-eval 은 React 가 오류 스택을 복원하는 데 쓴다. 운영에는 없다.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // 이식된 레거시 앱이 style 속성을 많이 쓴다. 글꼴은 next/font 가 같은 도메인에서 내보낸다.
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self' data:`,
    `img-src 'self' blob: data: https:`,
    `media-src 'self' blob: https://*.supabase.co`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${dev ? ' ws://localhost:* http://localhost:*' : ''}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ]
  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const next = () => NextResponse.next({ request: { headers: requestHeaders } })
  let response = next()

  let userId: string | null = null
  const env = supabasePublicEnv()
  if (env) {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = next()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    })
    // getClaims 는 서명 키로 토큰을 검증한다. 만료됐으면 갱신하고 쿠키를 다시 쓴다.
    const { data } = await supabase.auth.getClaims()
    userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null
  }

  const { pathname, search } = request.nextUrl
  if (!userId && isProtected(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', `${pathname}${search}`)
    const redirect = NextResponse.redirect(url)
    // 갱신된 세션 쿠키가 있으면 리다이렉트 응답에도 실어 보낸다.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    redirect.headers.set('Content-Security-Policy', csp)
    return redirect
  }

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      /*
       * 제외: API 라우트(자체 인증), 정적 파일, 이미지 최적화, 파비콘, 확장자 있는 정적 자산.
       * 링크 프리페치 요청도 제외한다 — HTML 문서가 아니라 nonce 가 필요 없다.
       */
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|txt|xml|json)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
