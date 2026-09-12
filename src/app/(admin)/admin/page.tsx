import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select } from '@/components/ui/form'
import { Badge, EmptyState, ErrorState, Notice, PageHeader, Section, Table, Td, Th, Tr } from '@/components/ui/primitives'
import { integratedProjects } from '@/content/projects'
import { requireAdmin } from '@/lib/auth/guards'
import { PROFILE_STATUSES, ROLE_LABELS, ROLES, STATUS_LABELS, type Profile } from '@/lib/auth/types'
import { formatDate } from '@/lib/notes'
import { PROFILE_COLUMNS } from '@/lib/supabase/server'
import { kstMonthStart } from '@/lib/usage/month'
import { formatUsd } from '@/lib/usage/pricing'
import { approveUser, saveUser, suspendUser } from './actions'

export const metadata: Metadata = { title: '관리 · 사용자' }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const { notice, error } = await searchParams
  const admin = await requireAdmin()
  const apps = integratedProjects()

  const [{ data: profileRows, error: profilesError }, { data: accessRows }, { data: usageRows }] = await Promise.all([
    admin.supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at', { ascending: false }),
    admin.supabase.from('app_access').select('user_id, app_slug'),
    admin.supabase.from('usage_monthly').select('user_id, cost_usd').eq('month', kstMonthStart()),
  ])

  const profiles = (profileRows ?? []) as Profile[]
  const accessByUser = new Map<string, Set<string>>()
  for (const row of accessRows ?? []) {
    const set = accessByUser.get(row.user_id) ?? new Set<string>()
    set.add(row.app_slug)
    accessByUser.set(row.user_id, set)
  }
  const usageByUser = new Map<string, number>()
  for (const row of usageRows ?? []) {
    usageByUser.set(row.user_id, (usageByUser.get(row.user_id) ?? 0) + Number(row.cost_usd))
  }

  const pending = profiles.filter((p) => p.status === 'pending')
  const others = profiles.filter((p) => p.status !== 'pending')

  return (
    <>
      <PageHeader title="사용자" description={`전체 ${profiles.length}명 · 승인 대기 ${pending.length}명`} />

      {profilesError && <ErrorState message={`사용자 목록을 불러오지 못했습니다: ${profilesError.message}`} />}
      {notice && (
        <Notice tone="ok" className="mb-6">
          {notice}
        </Notice>
      )}
      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}

      <Section title="승인 대기" aside={`${pending.length}명`}>
        {pending.length === 0 ? (
          <EmptyState message="대기 중인 가입이 없습니다." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>이름 · 이메일</Th>
                <Th>소속</Th>
                <Th>사용 목적</Th>
                <Th>가입</Th>
                <Th>역할로 승인</Th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <span className="font-medium">{p.display_name ?? '—'}</span>
                    <br />
                    <span className="text-caption text-muted">{p.email}</span>
                  </Td>
                  <Td>{p.affiliation ?? '—'}</Td>
                  <Td className="max-w-md whitespace-pre-line">{p.purpose ?? '—'}</Td>
                  <Td className="whitespace-nowrap">{formatDate(p.created_at.slice(0, 10))}</Td>
                  <Td>
                    <form className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <Select name="role" defaultValue="teacher" className="w-28" aria-label="역할">
                        <option value="teacher">교사</option>
                        <option value="student">학생</option>
                        <option value="guest">둘러보기</option>
                      </Select>
                      <Button type="submit" formAction={approveUser} variant="primary" size="sm">
                        승인
                      </Button>
                      <Button type="submit" formAction={suspendUser} variant="danger" size="sm">
                        거절
                      </Button>
                    </form>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="전체 사용자" aside="행마다 저장 버튼이 있습니다">
        {others.length === 0 ? (
          <EmptyState message="아직 사용자가 없습니다." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>이름 · 이메일</Th>
                <Th>역할</Th>
                <Th>상태</Th>
                <Th numeric>월 한도 $</Th>
                <Th numeric>이번 달</Th>
                <Th>앱 접근</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {others.map((p) => {
                const self = p.id === admin.user.id
                const access = accessByUser.get(p.id) ?? new Set<string>()
                const formId = `user-${p.id}`
                return (
                  <Tr key={p.id}>
                    <Td>
                      <form id={formId} action={saveUser}>
                        <input type="hidden" name="id" value={p.id} />
                      </form>
                      <span className="font-medium">{p.display_name ?? '—'}</span>
                      {self && (
                        <Badge tone="accent" className="ml-1.5">
                          나
                        </Badge>
                      )}
                      <br />
                      <span className="text-caption text-muted">{p.email}</span>
                      {p.affiliation && <span className="text-caption text-faint"> · {p.affiliation}</span>}
                    </Td>
                    <Td>
                      <Select form={formId} name="role" defaultValue={p.role} className="w-28" aria-label="역할" disabled={self}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                      {self && <input form={formId} type="hidden" name="role" value={p.role} />}
                    </Td>
                    <Td>
                      <Select form={formId} name="status" defaultValue={p.status} className="w-28" aria-label="상태" disabled={self}>
                        {PROFILE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                      {self && <input form={formId} type="hidden" name="status" value={p.status} />}
                    </Td>
                    <Td numeric>
                      <Input
                        form={formId}
                        name="budget"
                        type="number"
                        min={0}
                        max={10000}
                        step={0.5}
                        placeholder="기본"
                        defaultValue={p.monthly_budget_usd ?? ''}
                        className="w-24 text-right"
                        aria-label="월 한도(USD)"
                      />
                    </Td>
                    <Td numeric>{formatUsd(usageByUser.get(p.id) ?? 0)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-3">
                        {apps.map((app) => (
                          <label key={app.slug} className="inline-flex items-center gap-1.5 text-sm">
                            <Checkbox form={formId} name="access" value={app.slug} defaultChecked={access.has(app.slug)} />
                            {app.name}
                          </label>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Button form={formId} type="submit" size="sm">
                        저장
                      </Button>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
        <p className="mt-3 text-caption text-faint">
          역할은 기본 권한, 앱 접근은 역할과 무관하게 특정 앱만 열어 주는 예외입니다. 월 한도를 비우면 서버 기본값을
          씁니다. 관리자는 한도가 없습니다.
        </p>
      </Section>
    </>
  )
}
