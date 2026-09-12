import Link from 'next/link'
import { Suspense } from 'react'
import { NavLinks } from '@/components/nav-links'
import { Tagline, Wordmark } from '@/components/ui/wordmark'
import { UserMenu } from '@/components/user-menu'
import { site } from '@/content/site'

/**
 * 제호(masthead). 종이 맨 위의 굵은 괘선 하나, 왼쪽에 ABCDE. 와 태그라인, 오른쪽에 메뉴와 사용자.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-t-[3px] border-text bg-bg hairline-b">
      <div className="mx-auto flex h-14 max-w-site items-center justify-between gap-6 px-5">
        <Link href="/" className="flex min-w-0 items-baseline gap-3" aria-label={`${site.name} 홈`}>
          <Wordmark />
          <Tagline className="hidden truncate text-sm text-muted md:inline" />
        </Link>
        <div className="flex shrink-0 items-center gap-6">
          <NavLinks items={site.nav} />
          <Suspense fallback={<span className="h-8 w-24" aria-hidden="true" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
