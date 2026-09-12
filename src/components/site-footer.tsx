import Link from 'next/link'
import { Tagline, Wordmark } from '@/components/ui/wordmark'
import { site } from '@/content/site'

/** 판권면(colophon). 무엇으로 만들었고 어디로 이어지는지. */
export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-16 rule-t">
      <div className="mx-auto grid max-w-site gap-8 px-5 py-8 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-2 text-muted">
            <Tagline />
          </p>
          <p className="mt-2 max-w-prose text-muted">{site.description}</p>
        </div>

        <div>
          <p className="label-mono text-faint">둘러보기</p>
          <ul className="mt-2 space-y-1">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" className="hover:text-accent">
                문의
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-accent">
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="label-mono text-faint">판권</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>
              <a href={site.author.github} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                GitHub · {site.author.name}
              </a>
            </li>
            <li>
              <a href={site.legacySite} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                이전 사이트
              </a>
            </li>
            <li className="pt-2 text-caption text-faint">
              Next.js · Supabase · Vercel 로 만들었습니다.
              <br />
              글꼴: Noto Serif KR, IBM Plex Sans KR, IBM Plex Mono.
            </li>
            <li className="font-mono text-caption text-faint">© {year} {site.name}</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
