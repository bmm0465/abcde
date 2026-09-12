import Link from 'next/link'
import { NoteList } from '@/components/note-list'
import { ProjectList } from '@/components/project-list'
import { ButtonLink } from '@/components/ui/button'
import { Section } from '@/components/ui/primitives'
import { Tagline } from '@/components/ui/wordmark'
import { projects } from '@/content/projects'
import { site } from '@/content/site'
import { getNotes } from '@/lib/notes'

const HOW_IT_WORKS = [
  {
    term: '둘러보기',
    value: '프로젝트 소개, 아키텍처, 결과 화면, 현장 기록은 로그인 없이 읽을 수 있습니다.',
  },
  {
    term: '가입 · 승인',
    value:
      'AI 채점·문항 생성처럼 비용이 드는 도구는 가입 후 관리자 승인을 받은 교사 계정으로 씁니다. 사용량에는 월 한도가 있습니다.',
  },
  {
    term: '학생 계정',
    value: '학생은 직접 가입하지 않습니다. 담당 교사가 학급 단위로 계정을 만들어 나눠 줍니다.',
  },
]

export default async function HomePage() {
  const allNotes = await getNotes()
  const notes = allNotes.slice(0, 3)
  const years = projects.map((p) => p.year)
  const span = `${Math.min(...years)}–${Math.max(...years)}`

  return (
    <>
      {/* 리드 — 모눈종이 위의 제호. 히어로가 아니라 표지의 첫 문단. */}
      <section className="paper-grid -mx-5 -mt-8 mb-12 border-b border-line-strong px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-site">
          <p className="text-base text-muted">
            <Tagline />
          </p>
          <h1 className="mt-3 max-w-[14ch] text-hero tracking-tight">{site.headline}</h1>
          <p className="mt-5 max-w-prose text-base text-muted sm:text-lg">{site.description}</p>
          <p className="label-mono mt-6 text-faint">
            프로젝트 {projects.length} · 기록 {allNotes.length} · {span}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/projects" variant="primary">
              프로젝트 보기
            </ButtonLink>
            <ButtonLink href="/notes">기록 읽기</ButtonLink>
          </div>
        </div>
      </section>

      <Section
        number="01"
        title="프로젝트"
        aside={
          <Link href="/projects" className="text-accent hover:text-accent-hover">
            전체 보기 →
          </Link>
        }
      >
        <ProjectList projects={projects} />
      </Section>

      <Section
        number="02"
        title="기록"
        aside={
          <Link href="/notes" className="text-accent hover:text-accent-hover">
            전체 보기 →
          </Link>
        }
      >
        <NoteList notes={notes} />
      </Section>

      <Section number="03" title="이 사이트를 쓰는 법">
        <dl className="grid gap-x-8 gap-y-4 rule-t pt-4 text-sm sm:grid-cols-[minmax(6rem,auto)_1fr]">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.term} className="contents">
              <dt className="font-serif text-lg font-semibold">{item.term}</dt>
              <dd className="text-muted">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  )
}
