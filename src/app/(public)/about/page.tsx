import type { Metadata } from 'next'
import { DefList, PageHeader, Section } from '@/components/ui/primitives'
import { site } from '@/content/site'

export const metadata: Metadata = { title: '소개' }

const STACK = [
  { term: '데이터 분석', value: 'Python · pandas · matplotlib · 통계 검정' },
  { term: '웹', value: 'Next.js · TypeScript · Tailwind CSS' },
  { term: '인프라', value: 'Supabase (Auth · Postgres · Storage) · Vercel' },
  { term: 'AI', value: 'OpenAI · Google Gemini · Anthropic Claude · 음성 인식(STT)' },
]

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="교실과 데이터, 그 사이에서" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="prose">
          <blockquote>&ldquo;선생님, 이건 왜 배워요?&rdquo;</blockquote>
          <p>
            아이들의 순수한 질문에서 시작된 고민은 저를 데이터의 세계로 이끌었습니다. ABCDE(A Better Class: Data &amp;
            Education) Project 는 교실에서 마주하는 학습 격차, 정서적 어려움, 평가의 모호함 같은 문제들을 데이터
            기반의 접근으로 풀어 보려는 저의 도전이자 기록입니다.
          </p>

          <h2>나의 여정</h2>
          <p>
            5년간 초등 교사로 재직하며 교실에서 마주했던 실제 문제들로부터 시작되었습니다. 학생들의 학습 격차, 교우
            관계의 어려움, 개인별 잠재력 발현의 한계 등은 직관이나 경험만으로는 해결하기 어려운 복합적인 문제입니다.
          </p>
          <p>
            저는 이러한 교육 현장의 난제들을 데이터 기반의 과학적 접근을 통해 분석하고, 실질적인 해결책을 제시하고자
            합니다. 지금은 예비 초등영어교사를 가르치는 강의에서도 같은 질문을 이어 가고 있습니다.
          </p>

          <h2>이 사이트의 원칙</h2>
          <ul>
            <li>결과보다 과정을 남긴다. 실패한 시도도 기록한다.</li>
            <li>AI 의 판단은 언제나 &ldquo;검토 필요&rdquo; 로 표기한다. 판단하는 자리에는 교사가 있다.</li>
            <li>학생의 이름·목소리·응답은 최소한으로 모으고, 보관 기간을 정해 지운다.</li>
          </ul>
        </div>

        <aside>
          <Section title="Tech Stack">
            <DefList items={STACK} />
          </Section>
          <Section title="링크">
            <ul className="space-y-1.5 text-sm">
              <li>
                <a
                  href={site.author.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover hover:underline"
                >
                  GitHub ↗
                </a>
              </li>
              <li>
                <a
                  href={site.legacySite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover hover:underline"
                >
                  이전 사이트 (bmm0465.github.io) ↗
                </a>
              </li>
            </ul>
          </Section>
        </aside>
      </div>
    </>
  )
}
