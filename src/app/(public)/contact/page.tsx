import type { Metadata } from 'next'
import { ButtonLink, ExternalButtonLink } from '@/components/ui/button'
import { DefList, PageHeader } from '@/components/ui/primitives'
import { site } from '@/content/site'

export const metadata: Metadata = { title: '문의' }

export default function ContactPage() {
  return (
    <>
      <PageHeader title="문의" description="데이터 기반 교육이나 에듀테크 연구에 대해 궁금한 점이 있으시면 연락 주세요." />

      <div className="max-w-prose space-y-8">
        <DefList
          items={[
            {
              term: '도구 사용',
              value: '가입 후 관리자 승인을 받으면 씁니다. 가입 화면의 "사용 목적" 에 학교·수업 맥락을 적어 주시면 승인이 빠릅니다.',
            },
            {
              term: '연구 협업',
              value: '데이터 분석, 평가 도구 개발, 수업 적용 사례를 함께 만들고 싶은 분을 환영합니다.',
            },
            {
              term: '개인정보',
              value: '본인 또는 자녀의 데이터 열람·삭제 요청도 같은 경로로 받습니다.',
            },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          {site.contactEmail && (
            <ExternalButtonLink href={`mailto:${site.contactEmail}`} variant="primary" target={undefined} rel={undefined}>
              이메일 보내기
            </ExternalButtonLink>
          )}
          <ExternalButtonLink href={site.author.github} variant={site.contactEmail ? 'secondary' : 'primary'}>
            GitHub 로 연락
          </ExternalButtonLink>
          <ButtonLink href="/signup">가입 신청</ButtonLink>
        </div>
      </div>
    </>
  )
}
