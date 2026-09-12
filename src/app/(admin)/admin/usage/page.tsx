import type { Metadata } from 'next'
import { EmptyState, ErrorState, PageHeader, Section, Table, Td, Th, Tr } from '@/components/ui/primitives'
import { getProject } from '@/content/projects'
import { requireAdmin } from '@/lib/auth/guards'
import { kstMonthStart } from '@/lib/usage/month'
import { formatUsd } from '@/lib/usage/pricing'

export const metadata: Metadata = { title: '관리 · 사용량' }

interface UsageRow {
  user_id: string | null
  app_slug: string
  month: string
  calls: number
  tokens_in: number
  tokens_out: number
  cost_usd: number
}

function MonthTable({ rows, names }: { rows: UsageRow[]; names: Map<string, string> }) {
  if (rows.length === 0) return <EmptyState message="기록이 없습니다." />
  const total = rows.reduce((s, r) => s + Number(r.cost_usd), 0)
  return (
    <Table>
      <thead>
        <tr>
          <Th>사용자</Th>
          <Th>앱</Th>
          <Th numeric>호출</Th>
          <Th numeric>입력 토큰</Th>
          <Th numeric>출력 토큰</Th>
          <Th numeric>추정 비용</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={`${r.user_id}-${r.app_slug}`}>
            <Td>{r.user_id ? (names.get(r.user_id) ?? r.user_id.slice(0, 8)) : '(삭제된 계정)'}</Td>
            <Td>{getProject(r.app_slug)?.name ?? r.app_slug}</Td>
            <Td numeric>{r.calls.toLocaleString('ko-KR')}</Td>
            <Td numeric>{Number(r.tokens_in).toLocaleString('ko-KR')}</Td>
            <Td numeric>{Number(r.tokens_out).toLocaleString('ko-KR')}</Td>
            <Td numeric>{formatUsd(Number(r.cost_usd))}</Td>
          </Tr>
        ))}
        <tr>
          <Td colSpan={5} className="font-medium">
            합계
          </Td>
          <Td numeric className="font-medium">
            {formatUsd(total)}
          </Td>
        </tr>
      </tbody>
    </Table>
  )
}

export default async function AdminUsagePage() {
  const admin = await requireAdmin()
  const thisMonth = kstMonthStart()
  const lastMonth = kstMonthStart(-1)

  const [{ data: rows, error }, { data: profiles }] = await Promise.all([
    admin.supabase
      .from('usage_monthly')
      .select('user_id, app_slug, month, calls, tokens_in, tokens_out, cost_usd')
      .in('month', [thisMonth, lastMonth])
      .order('cost_usd', { ascending: false }),
    admin.supabase.from('profiles').select('id, display_name, email'),
  ])

  const names = new Map<string, string>()
  for (const p of profiles ?? []) names.set(p.id, p.display_name ?? p.email ?? p.id)
  const all = (rows ?? []) as UsageRow[]

  return (
    <>
      <PageHeader title="사용량" description="AI 호출의 추정 비용입니다. 실제 청구는 각 제공자 대시보드가 정본입니다." />
      {error && <ErrorState message={`사용량을 불러오지 못했습니다: ${error.message}`} />}
      <Section title={`이번 달 (${thisMonth.slice(0, 7)})`}>
        <MonthTable rows={all.filter((r) => r.month === thisMonth)} names={names} />
      </Section>
      <Section title={`지난 달 (${lastMonth.slice(0, 7)})`}>
        <MonthTable rows={all.filter((r) => r.month === lastMonth)} names={names} />
      </Section>
    </>
  )
}
