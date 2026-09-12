import type { Metadata } from 'next'
import { corpusSize } from '@/apps/aieewa/rag'
import { Notice, PageHeader } from '@/components/ui/primitives'
import { requireProjectAccess } from '@/lib/auth/guards'
import { GenerateForm } from './generate-form'

export const metadata: Metadata = { title: '문항 생성' }

export default async function GeneratePage() {
  const { viewer } = await requireProjectAccess('aieewa', '/aieewa/generate')
  const corpus = await corpusSize(viewer.supabase)

  return (
    <>
      <PageHeader
        back={{ href: '/aieewa', label: '문항' }}
        eyebrow="AIEEWA"
        title="문항 생성"
        description="요청을 적으면 예시문, 평가 문항, 조건, 모범 답안, 분석적·총체적 채점 기준, 성취수준별 예시 답안과 피드백을 한 세트로 만듭니다."
      />

      {corpus.chunks === 0 ? (
        <Notice tone="warn" className="mb-8 max-w-prose">
          참고 문서가 없어 교과서·성취기준에 근거하지 않고 생성합니다. 결과를 반드시 검토하세요.
        </Notice>
      ) : (
        <Notice tone="info" className="mb-8 max-w-prose">
          참고 문서 {corpus.documents}건에서 관련 내용을 찾아 생성합니다.
        </Notice>
      )}

      <GenerateForm />
    </>
  )
}
