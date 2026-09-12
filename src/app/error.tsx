'use client'

import { Button, ButtonLink } from '@/components/ui/button'

/**
 * 오류: 무슨 일이 일어났는지 + 사용자가 할 수 있는 것 + 지원 코드.
 * "이런! 문제가 생겼어요" 식의 감탄사는 쓰지 않는다.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-site flex-1 flex-col items-start justify-center px-5 py-16">
      <p className="text-caption text-faint">오류</p>
      <h1 className="mt-1 text-title font-normal tracking-tight">화면을 그리지 못했습니다</h1>
      <p className="mt-2 max-w-prose text-base text-muted">
        일시적인 문제일 수 있습니다. 다시 시도해도 같다면 아래 코드와 함께 알려 주세요.
      </p>
      {error.digest && <p className="mt-2 font-mono text-caption text-faint">code: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={reset}>
          다시 시도
        </Button>
        <ButtonLink href="/">첫 화면으로</ButtonLink>
      </div>
    </main>
  )
}
