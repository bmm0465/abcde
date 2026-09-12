import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { site } from '@/content/site'
import { siteUrl } from '@/lib/env'

/**
 * 글꼴 셋. 빌드 때 받아 같은 도메인에서 내보내므로 CSP 의 font-src 'self' 로 충분하다.
 * - 명조(Noto Serif KR): 제목. 종이 위의 활자.
 * - IBM Plex Sans KR: 본문과 UI. 기술 문서의 결.
 * - IBM Plex Mono: 날짜·숫자·라벨. 기록지의 도장.
 */
const serif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-serif-kr',
  display: 'swap',
})

const sans = IBM_Plex_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.name,
    description: site.description,
    locale: 'ko_KR',
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // nonce 기반 CSP(src/proxy.ts)는 요청마다 새 nonce 를 심는다.
  // 정적으로 미리 만들어진 화면에는 nonce 가 없어 Next 의 인라인 스크립트가 막히므로,
  // 여기서 요청 헤더를 읽어 모든 화면을 요청 시점에 렌더링한다.
  await headers()

  return (
    <html lang="ko" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  )
}
