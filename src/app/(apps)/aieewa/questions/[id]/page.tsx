import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  CRITERIA_LABELS,
  HOLISTIC_LEVELS,
  SCORE_MODE_LABELS,
  type AnswerRow,
  type QuestionRow,
} from '@/apps/aieewa/types'
import { Badge, DefList, EmptyState, Notice, PageHeader, Panel, Section, Table, Td, Th, Tr } from '@/components/ui/primitives'
import { requireProjectAccess } from '@/lib/auth/guards'
import { formatDate } from '@/lib/notes'
import { ScoreForm } from './score-form'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const { viewer } = await requireProjectAccess('aieewa', `/aieewa/questions/${id}`)
  const { data } = await viewer.supabase.from('aieewa_questions').select('grade_unit').eq('id', id).maybeSingle()
  return { title: data?.grade_unit ?? '문항' }
}

/** 본문에 줄바꿈이 살아 있어야 예시문과 답안이 읽힌다. */
function Preformatted({ children }: { children: string }) {
  return <p className="whitespace-pre-wrap text-base">{children}</p>
}

export default async function QuestionPage({ params }: Params) {
  const { id } = await params
  const { viewer } = await requireProjectAccess('aieewa', `/aieewa/questions/${id}`)

  const [{ data: questionRow }, { data: answerRows }] = await Promise.all([
    viewer.supabase.from('aieewa_questions').select('*').eq('id', id).maybeSingle(),
    viewer.supabase
      .from('aieewa_answers')
      .select('*')
      .eq('question_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!questionRow) notFound()
  const question = questionRow as QuestionRow
  const answers = (answerRows ?? []) as AnswerRow[]

  const grounding =
    question.context_chunks === 0
      ? { tone: 'warn' as const, label: '참고 문서 없이 생성' }
      : question.grounding_score === null
        ? { tone: 'neutral' as const, label: `참고 문서 ${question.context_chunks}개 · 미검증` }
        : {
            tone: question.grounding_score >= 3 ? ('ok' as const) : ('warn' as const),
            label: `참고 문서 ${question.context_chunks}개 · 기반성 ${question.grounding_score}/4`,
          }

  return (
    <>
      <PageHeader
        back={{ href: '/aieewa', label: '문항' }}
        eyebrow={`${question.grade_unit} · ${formatDate(question.created_at.slice(0, 10))}`}
        title={question.prompt}
        actions={<Badge tone={grounding.tone}>{grounding.label}</Badge>}
      />

      <Notice tone="warn" className="mb-10 max-w-prose">
        AI 가 만든 문항과 채점 기준입니다. 수업에 쓰기 전에 어휘 수준과 성취기준 부합 여부를 검토하세요.
      </Notice>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          <Section number="01" title="문항">
            <div className="flex flex-col gap-5">
              <div>
                <p className="label-mono mb-1.5 text-faint">예시문</p>
                <Panel className="px-4 py-3">
                  <Preformatted>{question.passage}</Preformatted>
                </Panel>
              </div>
              <div>
                <p className="label-mono mb-1.5 text-faint">평가 문항</p>
                <Preformatted>{question.prompt}</Preformatted>
              </div>
              <div>
                <p className="label-mono mb-1.5 text-faint">조건</p>
                <Preformatted>{question.conditions}</Preformatted>
              </div>
              <div>
                <p className="label-mono mb-1.5 text-faint">모범 답안</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.model_answers.map((sample, i) => (
                    <Panel key={i} className="px-4 py-3">
                      <p className="label-mono mb-1 text-faint">{i + 1}</p>
                      <Preformatted>{sample}</Preformatted>
                    </Panel>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section number="02" title="분석적 채점 기준" aside="각 0~2점 · 총 6점">
            <div className="flex flex-col gap-4">
              {question.analytic_criteria.map((criterion, i) => {
                const meta = CRITERIA_LABELS[i]
                return (
                  <div key={i}>
                    <p className="mb-1.5 text-sm font-medium">
                      {i + 1}. {meta?.label ?? `기준 ${i + 1}`}
                      {meta && <span className="ml-1.5 font-normal text-faint">{meta.hint}</span>}
                    </p>
                    <Preformatted>{criterion}</Preformatted>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section number="03" title="총체적 채점 기준과 성취수준별 예시">
            <div className="flex flex-col gap-6">
              {HOLISTIC_LEVELS.map((level) => (
                <div key={level}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Badge tone="accent">{level} 수준</Badge>
                  </p>
                  <Preformatted>{question.holistic_criteria[level]}</Preformatted>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Panel className="px-4 py-3">
                      <p className="label-mono mb-1 text-faint">예시 답안</p>
                      <Preformatted>{question.level_answers[level]}</Preformatted>
                    </Panel>
                    <Panel className="px-4 py-3">
                      <p className="label-mono mb-1 text-faint">예시 피드백</p>
                      <Preformatted>{question.level_feedback[level]}</Preformatted>
                    </Panel>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="lg:pt-1">
          <Section title="생성 기록">
            <DefList
              items={[
                { term: '단원·학년', value: question.grade_unit },
                { term: '만든 날', value: formatDate(question.created_at.slice(0, 10)) },
                { term: '모델', value: <span className="font-mono text-caption">{question.model}</span> },
                { term: '참고 문서', value: `${question.context_chunks}개 청크` },
                {
                  term: '기반성',
                  value:
                    question.grounding_score === null ? '검증하지 않음' : `${question.grounding_score} / 4`,
                },
                { term: '채점한 답안', value: `${answers.length}건` },
              ]}
            />
            <div className="mt-5">
              <p className="label-mono mb-1.5 text-faint">요청 원문</p>
              <p className="whitespace-pre-wrap text-sm text-muted">{question.request}</p>
            </div>
          </Section>
        </aside>
      </div>

      <Section number="04" title="답안 채점">
        <ScoreForm questionId={question.id} />
      </Section>

      <Section number="05" title="채점 결과" aside={`${answers.length}건`}>
        {answers.length === 0 ? (
          <EmptyState message="아직 채점한 답안이 없습니다. 위에서 학생 답안을 붙여 넣고 채점하세요." />
        ) : (
          <div className="flex flex-col gap-5">
            {answers.map((a) => (
              <Panel key={a.id} className="px-4 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 pb-2 hairline-b">
                  <span className="font-medium">{a.student_label}</span>
                  <Badge tone="accent">{a.holistic} 수준</Badge>
                  <span className="font-mono text-sm tabular-nums">{a.total_score} / 6</span>
                  <Badge>{SCORE_MODE_LABELS[a.mode]}</Badge>
                  {a.accuracy_score !== null && (
                    <Badge tone={a.accuracy_score >= 3 ? 'ok' : 'warn'}>정확성 {a.accuracy_score}/4</Badge>
                  )}
                  {a.feedback_score !== null && (
                    <Badge tone={a.feedback_score >= 3 ? 'ok' : 'warn'}>피드백 {a.feedback_score}/4</Badge>
                  )}
                  <span className="ml-auto font-mono text-caption text-faint">
                    {formatDate(a.created_at.slice(0, 10))}
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <p className="label-mono mb-1.5 text-faint">답안</p>
                    <p className="whitespace-pre-wrap text-sm">{a.answer}</p>
                  </div>
                  <div>
                    <Table>
                      <thead>
                        <tr>
                          <Th>영역</Th>
                          <Th numeric>점수</Th>
                          <Th>근거</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: '과제 수행', score: a.score_task, reason: a.reason_task },
                          { label: '내용 구성', score: a.score_organization, reason: a.reason_organization },
                          { label: '언어 사용', score: a.score_language, reason: a.reason_language },
                        ].map((row) => (
                          <Tr key={row.label}>
                            <Td className="whitespace-nowrap">{row.label}</Td>
                            <Td numeric>{row.score}</Td>
                            <Td className="text-muted">{row.reason ?? '—'}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>

                <div className="mt-4 border-l-[3px] border-accent bg-accent-weak px-3 py-2.5">
                  <p className="label-mono mb-1 text-accent">피드백 (검토 필요)</p>
                  <p className="whitespace-pre-wrap text-sm">{a.feedback}</p>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
