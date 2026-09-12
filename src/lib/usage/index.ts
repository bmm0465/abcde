import 'server-only'

import type { Profile } from '@/lib/auth/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { estimateCostUsd, type UsageInput } from '@/lib/usage/pricing'

/**
 * 사용량 통제. 모든 LLM·STT·TTS 호출은 서버에서만 일어나고, 호출 전에 한도를 보고 호출 후에 기록한다.
 * 기록은 service_role 로 쓴다(사용자는 자기 기록을 읽을 수만 있다).
 */

export const DEFAULT_MONTHLY_BUDGET_USD = 5
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 20

export class UsageLimitError extends Error {
  constructor(
    public readonly used: number,
    public readonly budget: number,
  ) {
    super(`이번 달 사용 한도($${budget.toFixed(2)})를 넘었습니다. 현재 $${used.toFixed(2)}.`)
    this.name = 'UsageLimitError'
  }
}

export class RateLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`요청이 너무 잦습니다. 분당 ${limit}회까지 가능합니다.`)
    this.name = 'RateLimitError'
  }
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw ? Number(raw) : Number.NaN
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** 사용자의 월 한도. 프로필 값이 없으면 환경 변수, 그것도 없으면 기본값. 관리자는 무제한. */
export function budgetFor(profile: Pick<Profile, 'role' | 'monthly_budget_usd'>): number {
  if (profile.role === 'admin') return Number.POSITIVE_INFINITY
  if (profile.monthly_budget_usd !== null && profile.monthly_budget_usd !== undefined) {
    return Number(profile.monthly_budget_usd)
  }
  return envNumber('DEFAULT_MONTHLY_BUDGET_USD', DEFAULT_MONTHLY_BUDGET_USD)
}

export async function getMonthlyUsageUsd(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('monthly_usage_usd', { uid: userId })
  if (error) throw new Error(`사용량 조회 실패: ${error.message}`)
  return Number(data ?? 0)
}

export async function assertWithinBudget(profile: Profile): Promise<{ used: number; budget: number }> {
  const budget = budgetFor(profile)
  if (!Number.isFinite(budget)) return { used: 0, budget }
  const used = await getMonthlyUsageUsd(profile.id)
  if (used >= budget) throw new UsageLimitError(used, budget)
  return { used, budget }
}

/** 분당 호출 수 제한. 창 안의 요청 수를 세고, 넘으면 던진다. */
export async function assertRateLimit(userId: string, route: string): Promise<void> {
  const limit = envNumber('RATE_LIMIT_PER_MINUTE', DEFAULT_RATE_LIMIT_PER_MINUTE)
  if (limit === 0) return
  const admin = createAdminClient()
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await admin
    .from('api_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)
  if (error) throw new Error(`속도 제한 조회 실패: ${error.message}`)
  if ((count ?? 0) >= limit) throw new RateLimitError(limit)
  await admin.from('api_requests').insert({ user_id: userId, route })
}

export interface UsageEvent extends UsageInput {
  userId: string
  appSlug: string
  provider: 'openai' | 'google' | 'anthropic' | 'aws' | 'azure' | 'other'
  kind?: 'chat' | 'embedding' | 'stt' | 'tts' | 'image' | 'other'
  meta?: Record<string, unknown>
}

/** 호출 결과를 기록한다. 기록 실패가 사용자 요청을 깨뜨리지 않도록 예외를 삼키고 로그만 남긴다. */
export async function recordUsage(event: UsageEvent): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('usage_events').insert({
      user_id: event.userId,
      app_slug: event.appSlug,
      provider: event.provider,
      model: event.model,
      kind: event.kind ?? 'chat',
      tokens_in: event.tokensIn ?? 0,
      tokens_out: event.tokensOut ?? 0,
      units: event.units ?? 0,
      est_cost_usd: estimateCostUsd(event),
      meta: event.meta ?? null,
    })
    if (error) console.error('[usage] 기록 실패:', error.message)
  } catch (err) {
    console.error('[usage] 기록 실패:', err instanceof Error ? err.message : err)
  }
}
