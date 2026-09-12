import Link from 'next/link'
import { NavLinks } from '@/components/nav-links'

/**
 * 통합 앱의 컨텍스트 바. 상단 제호 바로 아래 얇게 붙는다.
 * "ABCDE ▸ AIEEWA" 로 지금 어디에 있는지 알려 주고, 그 앱 안의 메뉴를 건다.
 */
export function AppBar({
  slug,
  name,
  nav,
}: {
  slug: string
  name: string
  nav: readonly { href: string; label: string }[]
}) {
  return (
    <div className="bg-sunken/60 hairline-b">
      <div className="mx-auto flex min-h-10 max-w-app flex-wrap items-center gap-x-5 gap-y-1 px-5 py-1">
        <p className="label-mono flex items-center gap-1.5 text-faint">
          <Link href="/" className="hover:text-text">
            ABCDE
          </Link>
          <span aria-hidden="true">▸</span>
          <Link href={`/projects/${slug}`} className="text-muted hover:text-text">
            {name}
          </Link>
        </p>
        <NavLinks items={nav} />
      </div>
    </div>
  )
}
