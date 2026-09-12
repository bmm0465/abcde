import { NavLinks } from '@/components/nav-links'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

const ADMIN_NAV = [
  { href: '/admin', label: '사용자' },
  { href: '/admin/usage', label: '사용량' },
]

/**
 * 관리자 영역의 틀. 인가 판단은 여기서 하지 않는다 — 레이아웃은 이동 시 다시 실행되지 않는다.
 * 각 page.tsx 와 서버 액션이 requireAdmin() 을 첫 줄에서 부른다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="bg-sunken/60 hairline-b">
        <div className="mx-auto flex h-10 max-w-site items-center gap-4 px-5">
          <span className="text-caption text-faint">관리</span>
          <NavLinks items={ADMIN_NAV} />
        </div>
      </div>
      <main className="mx-auto w-full max-w-site flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </>
  )
}
