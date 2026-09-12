import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/cn'

/** Field Notes 본문. 스타일은 globals.css 의 .prose 가 맡는다. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('prose', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const external = typeof href === 'string' && /^https?:\/\//.test(href)
            return (
              <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                {children}
              </a>
            )
          },
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
