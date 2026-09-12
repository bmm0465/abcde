'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

export function NavLinks({ items, className }: { items: readonly { href: string; label: string }[]; className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="주 메뉴" className={cn('flex items-center gap-4 text-sm', className)}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative py-1 transition-colors duration-100 ease-out',
              // 현재 위치는 붉은 연필로 밑줄 하나
              'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-mark after:opacity-0',
              active ? 'text-text font-medium after:opacity-100' : 'text-muted hover:text-text',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
