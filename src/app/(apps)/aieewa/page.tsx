import type { Metadata } from 'next'
import Link from 'next/link'
import { corpusSize } from '@/apps/aieewa/rag'
import type { QuestionRow } from '@/apps/aieewa/types'
import { ButtonLink } from '@/components/ui/button'
import { Badge, EmptyState, Notice, PageHeader, Section, Table, Td, Th, Tr } from '@/components/ui/primitives'
import { requireProjectAccess } from '@/lib/auth/guards'
import { formatDate } from '@/lib/notes'

export const metadata: Metadata = { title: '문항' }

export default async function AieewaHomePage() {
  const { viewer } = await requireProjectAccess('aieewa', '/aieewa')

  const [{ data: questions }, { data: answerCounts }, corpus] = await Promise.all([
    viewer.supabase
      .from('aieewa_questions')
      .select('id, grade_unit, prompt, created_at, grounding_score, context_chunks, model')
      .order('created_at', { ascending: false })
      .limit(50),
    viewer.supabase.from('aieewa_answers').select('question_id'),
    corpusSize(viewer.supabase),
  ])

  const rows = (questions ?? []) as Pick<
    QuestionRow,
    'id' | 'grade_unit' | 'prompt' | 'created_at' | 'grounding_score' | 'context_chunks' | 'model'
  >[]

  const scored = new Map<string, number>()
  for (const a of answerCounts ?? []) {
    scored.set(a.question_id, (scored.get(a.question_id) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader
        eyebrow="AIEEWA"
        title="내 문항"
        description="생성한 서술형 평가 문항과 채점 기준입니다. 문항을 열면 학생 답안을 채점할 수 있습니다."
        actions={
          <ButtonLink href="/aieewa/generate" variant="primary">
            문항 생성
          </ButtonLink>
        }
      />

      {corpus.chunks === 0 && (
        <Notice tone="warn" className="mb-8 max-w-prose">
          참고 문서 코퍼스가 비어 있습니다. 지금도 문항은 만들어지지만 교과서·성취기준에 근거하지 않습니다.
          교육과정 자료를 넣으려면 실행 가이드의 코퍼스 시드 절차를 따르세요.
        </Notice>
      )}

      <Section
        number="01"
        title="문항"
        aside={
          corpus.chunks > 0
            ? `참고 문서 ${corpus.documents}건 · 청크 ${corpus.chunks.toLocaleString('ko-KR')}개`
            : '참고 문서 없음'
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            message="아직 만든 문항이 없습니다. 학년과 단원, 원하는 활동을 적으면 문항과 채점 기준을 함께 만들어 줍니다."
            action={
              <ButtonLink href="/aieewa/generate" variant="primary">
                첫 문항 만들기
              </ButtonLink>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>만든 날</Th>
                <Th>단원 · 학년</Th>
                <Th>평가 문항</Th>
                <Th>근거</Th>
                <Th numeric>채점</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <Tr key={q.id}>
                  <Td className="whitespace-nowrap font-mono text-caption text-faint">
                    {formatDate(q.created_at.slice(0, 10))}
                  </Td>
                  <Td className="whitespace-nowrap">{q.grade_unit}</Td>
                  <Td>
                    <Link href={`/aieewa/questions/${q.id}`} className="text-accent hover:underline">
                      {q.prompt.length > 70 ? `${q.prompt.slice(0, 70)}…` : q.prompt}
                    </Link>
                  </Td>
                  <Td>
                    {q.context_chunks === 0 ? (
                      <Badge tone="warn">문서 없음</Badge>
                    ) : q.grounding_score === null ? (
                      <Badge>미검증</Badge>
                    ) : (
                      <Badge tone={q.grounding_score >= 3 ? 'ok' : 'warn'}>기반성 {q.grounding_score}/4</Badge>
                    )}
                  </Td>
                  <Td numeric>{scored.get(q.id) ?? 0}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section number="02" title="이 도구에 대해">
        <div className="prose">
          <p>
            검색 증강 생성(RAG)으로 교육과정 자료를 찾아 5~6학년 영어 서술형 문항과 채점 기준을 한 세트로 만듭니다.
            만들어진 문항이 실제로 문서에 근거했는지는 모델이 스스로 1~4점으로 매기고, 그 점수를 문항과 함께 남깁니다.
          </p>
          <p>
            채점은 분석적 3영역(과제 수행 · 내용 구성 · 언어 사용) 각 0~2점과 총체적 A/B/C 를 함께 매깁니다.
            근거 채점(AAS)을 고르면 교사 채점 예시를 참고해 채점하고, 채점의 정확성과 피드백의 품질을 스스로
            검토한 뒤 미흡하면 다시 채점합니다.
          </p>
          <p>
            <strong>AI 채점 결과는 언제나 검토 대상입니다.</strong> 점수와 피드백은 교사가 확인하고 고쳐서
            학생에게 전합니다. 학생의 실명 대신 번호나 별칭을 쓰시길 권합니다.
          </p>
        </div>
      </Section>
    </>
  )
}
