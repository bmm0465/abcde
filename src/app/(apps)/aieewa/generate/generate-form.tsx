'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/form'
import { ErrorState, Panel } from '@/components/ui/primitives'
import { errorMessageFrom, readNdjson } from '@/lib/ndjson'

const EXAMPLES = [
  '5학년 10단원, 자신이 정한 행사에 초대하는 글을 쓰는 서술형 평가 문항과 채점 기준을 만들어 줘.',
  '6학년 장래 희망 단원, 되고 싶은 직업과 그 이유를 쓰는 문항과 채점 기준을 만들어 줘.',
  '5학년 하루 일과 단원, 자신의 주말 계획을 시간 순서대로 쓰는 문항을 만들어 줘.',
]

export function GenerateForm() {
  const router = useRouter()
  const [request, setRequest] = useState('')
  const [steps, setSteps] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setSteps([])

    try {
      const response = await fetch('/api/aieewa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      })

      // 인증·권한·한도 오류는 스트림이 아니라 평범한 JSON 으로 온다.
      if (!response.ok) {
        setError(await errorMessageFrom(response))
        return
      }

      for await (const event of readNdjson(response)) {
        if (event.type === 'step') {
          setSteps((prev) => [...prev, event.label])
        } else if (event.type === 'error') {
          setError(event.message)
          return
        } else if (event.type === 'done') {
          const data = event.data as { id?: string }
          if (data.id) {
            router.push(`/aieewa/questions/${data.id}`)
            return
          }
        }
      }
      setError('생성이 끝나기 전에 연결이 끊겼습니다. 다시 시도해 주세요.')
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  function applyExample(text: string) {
    setRequest(text)
    textareaRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="max-w-prose">
      <Field
        id="request"
        label="요청"
        hint="학년과 단원, 학생이 무엇을 쓰게 할지를 함께 적으면 문항이 정확해집니다."
      >
        <Textarea
          id="request"
          ref={textareaRef}
          name="request"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          disabled={busy}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="예: 5학년 10단원, 자신이 정한 행사에 초대하는 글을 쓰는 문항과 채점 기준을 만들어 줘."
        />
      </Field>

      <div className="mt-3">
        <p className="label-mono mb-2 text-faint">예시로 시작하기</p>
        <ul className="flex flex-col gap-1.5">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                disabled={busy}
                onClick={() => applyExample(example)}
                className="text-left text-sm text-muted underline decoration-line-strong underline-offset-3 hover:text-accent disabled:opacity-45"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy || request.trim().length < 10}>
          {busy ? '생성 중…' : '문항 생성'}
        </Button>
        {busy && <span className="text-caption text-faint">30초에서 1분쯤 걸립니다. 화면을 닫지 마세요.</span>}
      </div>

      {steps.length > 0 && (
        <Panel className="mt-6 px-4 py-3">
          <p className="label-mono mb-2 text-faint">진행</p>
          <ol className="flex flex-col gap-1 text-sm">
            {steps.map((step, i) => {
              const last = i === steps.length - 1
              return (
                <li key={`${step}-${i}`} className={last && busy ? 'text-text' : 'text-muted'}>
                  <span className="font-mono text-caption text-faint">{String(i + 1).padStart(2, '0')}</span>{' '}
                  {step}
                  {!last && <span className="ml-1.5 text-ok">✓</span>}
                </li>
              )
            })}
          </ol>
        </Panel>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState message={error} />
        </div>
      )}
    </form>
  )
}
