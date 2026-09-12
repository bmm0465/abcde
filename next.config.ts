import type { NextConfig } from 'next'

/**
 * 보안 헤더. Content-Security-Policy 는 요청마다 nonce 가 달라서 src/proxy.ts 에서 붙인다.
 * X-XSS-Protection 은 구식이라 쓰지 않는다(CSP 가 대신한다).
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 마이크는 학생 평가(AIDAPEL 음성 응답)에 필요하다. 그 외 센서는 막는다.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
