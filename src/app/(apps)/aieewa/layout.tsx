import type { Metadata } from 'next'
import { AppBar } from '@/components/app-bar'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: { default: 'AIEEWA', template: '%s · AIEEWA · ABCDE Projects' },
}

const NAV = [
  { href: '/aieewa', label: '문항' },
  { href: '/aieewa/generate', label: '문항 생성' },
] as const

/**
 * 인가는 여기서 하지 않는다. 레이아웃은 화면을 옮길 때 다시 실행되지 않고,
 * 자식 세그먼트가 렌더되는 것을 막지도 못한다(Next 16 인증 가이드).
 * 각 page.tsx 와 API 라우트가 requireProjectAccess / guardLlmRequest 를 첫 줄에서 부른다.
 */
export default function AieewaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AppBar slug="aieewa" name="AIEEWA" nav={NAV} />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </>
  )
}
