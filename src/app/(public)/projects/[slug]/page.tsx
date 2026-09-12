import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NoteList } from '@/components/note-list'
import { STATUS_TONES } from '@/components/project-list'
import { Button, ButtonLink, ExternalButtonLink } from '@/components/ui/button'
import { Badge, DefList, Notice, PageHeader, Section } from '@/components/ui/primitives'
import {
  PROJECT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  getProject,
  type Project,
} from '@/content/projects'
import { ACCESS_REASON_LABELS, canUseProject, describeUseAccess } from '@/lib/auth/access'
import { isSupabaseConfigured } from '@/lib/env'
import { getNotes } from '@/lib/notes'
import { getAppAccess, getViewer } from '@/lib/supabase/server'

type Params = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)
  return project ? { title: `${project.name} — ${project.title}`, description: project.summary } : {}
}

/** 상세 화면 오른쪽 위의 단 하나의 행동. 상태·종류·권한에 따라 하나만 고른다. */
async function ProjectAction({ project }: { project: Project }) {
  if (project.kind === 'external' && project.entry) {
    return (
      <ExternalButtonLink href={project.entry} variant="primary">
        사이트 열기
      </ExternalButtonLink>
    )
  }
  if (project.kind !== 'integrated' || !project.entry) return null

  if (project.status === 'migrating' || project.status === 'planned') {
    return (
      <Button variant="secondary" disabled>
        {PROJECT_STATUS_LABELS[project.status]}
      </Button>
    )
  }

  const viewer = isSupabaseConfigured() ? await getViewer() : null
  const access = viewer ? await getAppAccess(viewer) : []
  const decision = canUseProject(viewer?.profile ?? null, project, access)

  if (decision.ok) {
    return (
      <ButtonLink href={project.entry} variant="primary">
        앱 열기
      </ButtonLink>
    )
  }
  if (decision.reason === 'login') {
    return (
      <ButtonLink href={`/login?next=${encodeURIComponent(project.entry)}`} variant="primary">
        로그인하고 사용
      </ButtonLink>
    )
  }
  if (decision.reason === 'pending') {
    return <ButtonLink href="/pending">승인 대기 중</ButtonLink>
  }
  return (
    <Button variant="secondary" disabled title={ACCESS_REASON_LABELS[decision.reason]}>
      사용 권한 없음
    </Button>
  )
}

export default async function ProjectPage({ params, searchParams }: Params) {
  const { slug } = await params
  const { error } = await searchParams
  const project = getProject(slug)
  if (!project) notFound()

  const related = project.relatedNotes?.length
    ? (await getNotes()).filter((n) => project.relatedNotes?.includes(n.slug))
    : []
  const legacy = project.links?.find((l) => l.label.includes('기존 배포'))

  return (
    <>
      <PageHeader
        back={{ href: '/projects', label: '프로젝트' }}
        eyebrow={`${PROJECT_KIND_LABELS[project.kind]} · ${project.year}`}
        title={`${project.name} — ${project.title}`}
        description={project.summary}
        actions={<ProjectAction project={project} />}
      />

      {error === 'role' && (
        <Notice tone="warn" className="mb-8 max-w-prose">
          {ACCESS_REASON_LABELS.role}
        </Notice>
      )}

      {project.status === 'migrating' && (
        <Notice tone="warn" className="mb-8">
          이 앱은 ABCDE Projects 로 이식하는 중입니다.
          {legacy && (
            <>
              {' '}
              그동안은{' '}
              <a href={legacy.href} target="_blank" rel="noopener noreferrer" className="underline">
                기존 배포
              </a>
              에서 쓸 수 있습니다.
            </>
          )}
        </Notice>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="prose">
            {project.description.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {project.features && (
            <Section title="기능" className="mt-10">
              <ul className="list-disc space-y-1.5 pl-5 text-base">
                {project.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Section>
          )}

          {related.length > 0 && (
            <Section title="관련 기록">
              <NoteList notes={related} />
            </Section>
          )}
        </div>

        <aside className="lg:pt-1">
          <DefList
            items={[
              {
                term: '상태',
                value: <Badge tone={STATUS_TONES[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>,
              },
              { term: '종류', value: PROJECT_KIND_LABELS[project.kind] },
              { term: '접근', value: describeUseAccess(project) },
              {
                term: '태그',
                value: (
                  <span className="flex flex-wrap gap-1">
                    {project.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </span>
                ),
              },
              ...(project.stack ? [{ term: '스택', value: project.stack.join(' · ') }] : []),
            ]}
          />
          {project.links && project.links.length > 0 && (
            <ul className="mt-6 space-y-1.5 text-sm">
              {project.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover hover:underline"
                  >
                    {l.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-caption text-faint">
            도구 사용 권한이 필요하면{' '}
            <Link href="/contact" className="underline">
              문의
            </Link>
            로 알려 주세요.
          </p>
        </aside>
      </div>
    </>
  )
}
