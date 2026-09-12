'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SCORE_MODES, type ScoreMode } from '@/apps/aieewa/types'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form'
import { ErrorState, Panel } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { errorMessageFrom, readNdjson } from '@/lib/ndjson'

const MODE_COPY: Record<ScoreMode, { label: string; detail: string }> = {
  standard: { label: '기본 채점', detail: '한 번 채점합니다. 빠르고 비용이 적습니다.' },
  aas: {
    label: '근거 채점 (AAS)',
    detail: '교사 채점 예시를 참고해 채점하고, 채점의 정확성과 피드백 품질을 스스로 검토합니다. 영역별 채점 근거가 남습니다.',
  },
}

export function ScoreForm({ questionId }: { questionId: string }) {
  const router = useRouter()
  const [studentLabel, setStudentLabel] = useState('')
  const [answer, setAnswer] = useState('')
  const [mode, setMode] = useState<ScoreMode>('aas')
  const [steps, setSteps] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setSteps([])

    try {
      const response = await fetch('/api/aieewa/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, studentLabel, answer, mode }),
      })

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
          setStudentLabel('')
          setAnswer('')
          setSteps([])
          router.refresh()
          return
        }
      }
      setError('채점이 끝나기 전에 연결이 끊겼습니다. 결과 목록을 새로 고쳐 확인해 주세요.')
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div className="flex flex-col gap-4">
        <Field
          id="student-label"
          label="학생 표시"
          hint="실명 대신 번호나 별칭을 쓰세요. 이 값은 채점 결과에 그대로 저장됩니다."
        >
          <Input
            id="student-label"
            name="studentLabel"
            required
            maxLength={40}
            disabled={busy}
            value={studentLabel}
            onChange={(e) => setStudentLabel(e.target.value)}
            placeholder="예: 3반 12번"
          />
        </Field>

        <Field id="answer" label="학생 답안">
          <Textarea
            id="answer"
            name="answer"
            rows={7}
            required
            maxLength={4000}
            disabled={busy}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="학생이 쓴 답안을 그대로 붙여 넣으세요."
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={busy || !studentLabel.trim() || !answer.trim()}>
            {busy ? '채점 중…' : '채점'}
          </Button>
          {busy && <span className="text-caption text-faint">모델이 여러 번 검토합니다. 잠시 기다려 주세요.</span>}
        </div>

        {error && <ErrorState message={error} />}
      </div>

      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-muted">채점 방식</legend>
          {SCORE_MODES.map((value) => (
            <label
              key={value}
              className={cn(
                'cursor-pointer rounded-sm border px-3 py-2.5 transition-colors duration-100 ease-out',
                mode === value ? 'border-accent bg-accent-weak' : 'border-line-strong hover:bg-sunken',
                busy && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  disabled={busy}
                  onChange={() => setMode(value)}
                  className="size-3.5 accent-accent"
                />
                <span className="text-sm font-medium">{MODE_COPY[value].label}</span>
              </span>
              <span className="mt-1 block pl-5.5 text-caption text-muted">{MODE_COPY[value].detail}</span>
            </label>
          ))}
        </fieldset>

        {steps.length > 0 && (
          <Panel className="px-3 py-2.5">
            <p className="label-mono mb-1.5 text-faint">진행</p>
            <ol className="flex flex-col gap-1 text-caption">
              {steps.map((step, i) => (
                <li key={`${step}-${i}`} className={i === steps.length - 1 && busy ? 'text-text' : 'text-muted'}>
                  {step}
                  {i < steps.length - 1 && <span className="ml-1.5 text-ok">✓</span>}
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>
    </form>
  )
}
