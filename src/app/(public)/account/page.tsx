import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form'
import { Badge, DefList, ErrorState, Notice, PageHeader, Section } from '@/components/ui/primitives'
import { integratedProjects } from '@/content/projects'
import { ACCESS_REASON_LABELS, canUseProject } from '@/lib/auth/access'
import { requireViewer } from '@/lib/auth/guards'
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/auth/types'
import { formatDate } from '@/lib/notes'
import { getAppAccess } from '@/lib/supabase/server'
import { budgetFor, getMonthlyUsageUsd } from '@/lib/usage'
import { formatUsd } from '@/lib/usage/pricing'
import { updateProfile } from './actions'

export const metadata: Metadata = { title: '내 계정' }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const { error, notice } = await searchParams
  const viewer = await requireViewer('/account')
  const profile = viewer.profile
  const access = await getAppAccess(viewer)

  let used: number | null = null
  if (profile) {
    try {
      used = await getMonthlyUsageUsd(viewer.supabase, profile.id)
    } catch {
      used = null
    }
  }
  const budget = profile ? budgetFor(profile) : null
  const ratio = used !== null && budget && Number.isFinite(budget) && budget > 0 ? Math.min(used / budget, 1) : 0

  return (
    <>
      <PageHeader title="내 계정" description={viewer.user.email ?? undefined} />

      {error === 'suspended' ? (
        <Notice tone="warn" className="mb-6 max-w-prose">
          이 계정은 정지 상태입니다. 도구를 쓸 수 없습니다. 문의 화면으로 연락해 주세요.
        </Notice>
      ) : error ? (
        <div className="mb-6 max-w-prose">
          <ErrorState message={error} />
        </div>
      ) : null}
      {notice && (
        <Notice tone="ok" className="mb-6 max-w-prose">
          {notice}
        </Notice>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Section title="상태">
            {profile ? (
              <DefList
                items={[
                  {
                    term: '역할',
                    value: <Badge tone={profile.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABELS[profile.role]}</Badge>,
                  },
                  {
                    term: '승인',
                    value: (
                      <Badge tone={profile.status === 'approved' ? 'ok' : profile.status === 'pending' ? 'warn' : 'danger'}>
                        {STATUS_LABELS[profile.status]}
                      </Badge>
                    ),
                  },
                  { term: '가입', value: formatDate(profile.created_at.slice(0, 10)) },
                  ...(profile.approved_at ? [{ term: '승인일', value: formatDate(profile.approved_at.slice(0, 10)) }] : []),
                ]}
              />
            ) : (
              <Notice tone="warn">프로필을 아직 만들지 못했습니다. 화면을 새로 고치면 다시 시도합니다.</Notice>
            )}
            {profile?.status === 'pending' && (
              <p className="mt-3 text-sm text-muted">
                승인되면 도구가 열립니다.{' '}
                <Link href="/pending" className="text-accent hover:underline">
                  자세히
                </Link>
              </p>
            )}
          </Section>

          <Section title="쓸 수 있는 도구">
            <ul className="divide-y divide-line rounded-md border border-line bg-surface">
              {integratedProjects().map((project) => {
                const decision = canUseProject(profile, project, access)
                const migrating = project.status === 'migrating' || project.status === 'planned'
                return (
                  <li key={project.slug} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted">
                        {migrating ? '이식 중 — 준비되면 여기서 바로 엽니다.' : decision.ok ? '사용 가능' : ACCESS_REASON_LABELS[decision.reason]}
                      </p>
                    </div>
                    {decision.ok && !migrating && project.entry ? (
                      <ButtonLink href={project.entry} size="sm" variant="primary">
                        열기
                      </ButtonLink>
                    ) : (
                      <ButtonLink href={`/projects/${project.slug}`} size="sm" variant="quiet">
                        소개
                      </ButtonLink>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section title="프로필 수정">
            <form action={updateProfile} className="flex max-w-prose flex-col gap-4">
              <Field id="display_name" label="이름">
                <Input id="display_name" name="display_name" required maxLength={40} defaultValue={profile?.display_name ?? ''} />
              </Field>
              <Field id="affiliation" label="소속" optional>
                <Input id="affiliation" name="affiliation" maxLength={80} defaultValue={profile?.affiliation ?? ''} />
              </Field>
              <Field id="purpose" label="사용 목적" optional hint="승인 판단에 참고합니다.">
                <Textarea id="purpose" name="purpose" rows={3} maxLength={300} defaultValue={profile?.purpose ?? ''} />
              </Field>
              <div>
                <Button type="submit" variant="primary" disabled={!profile}>
                  저장
                </Button>
              </div>
            </form>
          </Section>
        </div>

        <aside>
          <Section title="이번 달 사용량">
            {used === null ? (
              <p className="text-sm text-muted">사용량을 불러오지 못했습니다.</p>
            ) : (
              <>
                <p className="text-metric tabular-nums">
                  {formatUsd(used)}
                  <span className="ml-1 text-sm text-faint">
                    / {budget !== null && Number.isFinite(budget) ? formatUsd(budget) : '무제한'}
                  </span>
                </p>
                {budget !== null && Number.isFinite(budget) && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-inset" aria-hidden="true">
                    <div className="h-full bg-accent" style={{ width: `${Math.round(ratio * 100)}%` }} />
                  </div>
                )}
                <p className="mt-2 text-caption text-faint">
                  AI 호출 비용의 추정값입니다. 한도를 넘으면 다음 달까지 도구가 잠깁니다.
                </p>
              </>
            )}
          </Section>

          <Section title="보안">
            <div className="flex flex-col items-start gap-2">
              <ButtonLink href="/account/password" size="sm">
                비밀번호 변경
              </ButtonLink>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="quiet" size="sm">
                  로그아웃
                </Button>
              </form>
            </div>
          </Section>
        </aside>
      </div>
    </>
  )
}
