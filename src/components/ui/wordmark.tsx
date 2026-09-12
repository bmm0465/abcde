import { cn } from '@/lib/cn'

/**
 * ABCDE. — 워드마크.
 *
 * 이름의 뜻이 곧 마크다. A Better Class: Data & Education 의 머리글자 다섯을
 * 명조로 세우고, 문장을 끝내는 마침표 하나를 붉은 연필로 찍는다.
 * 그림·아이콘 없이 활자만이라 어디에 놓아도 종이 위의 제호처럼 보인다.
 */
export function Wordmark({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'lg' | 'xl' }) {
  const sizes = { sm: 'text-[1.125rem]', lg: 'text-display', xl: 'text-title' }
  return (
    <span
      className={cn('inline-flex items-baseline font-serif font-semibold leading-none tracking-wide', sizes[size], className)}
    >
      ABCDE<span className="text-mark">.</span>
    </span>
  )
}

/**
 * 태그라인. 머리글자 A·B·C·D·E 를 붉은 연필로 표시해 이름이 어디서 왔는지 보여 준다.
 */
export function Tagline({ className, plain }: { className?: string; plain?: boolean }) {
  const initial = plain ? '' : 'text-mark font-semibold'
  return (
    <span className={cn('font-serif', className)}>
      <span className={initial}>A</span> <span className={initial}>B</span>etter <span className={initial}>C</span>lass:{' '}
      <span className={initial}>D</span>ata &amp; <span className={initial}>E</span>ducation
    </span>
  )
}
