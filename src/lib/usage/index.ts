import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/auth/types'
import { estimateCostUsd, type UsageInput } from '@/lib/usage/pricing'

/**
 * 사용량 통제. 모든 LLM·STT·TTS 호출은 서버에서만 일어나고,
 * 호출 전에 한도를 보고 호출 뒤에 기록한다.
 *
 * ── service_role 을 쓰지 않는 이유 ──
 * 이 Supabase 프로젝트는 AIDAPEL 파일럿(초등학생 이름·음성 녹음)과 함께 쓴다.
 * service_role 키는 프로젝트 단위라 하나가 새면 그 데이터까지 열린다. 그래서
 * 기록과 속도 제한을 security definer 함수로 옮겼고(20260913010000 마이그레이션),
 * 여기서는 사용자 세션 클라이언트만 받는다. 배포 환경에 서버 키가 없어도 돈다.
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

/**
 * 이번 달(KST) 사용액. monthly_usage_usd 는 security invoker 라
 * 호출자가 볼 수 있는 행만 합산된다 — 본인 것, 관리자는 전부.
 */
export async function getMonthlyUsageUsd(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('monthly_usage_usd', { uid: userId })
  if (error) throw new Error(`사용량 조회 실패: ${error.message}`)
  return Number(data ?? 0)
}

export async function assertWithinBudget(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<{ used: number; budget: number }> {
  const budget = budgetFor(profile)
  if (!Number.isFinite(budget)) return { used: 0, budget }
  const used = await getMonthlyUsageUsd(supabase, profile.id)
  if (used >= budget) throw new UsageLimitError(used, budget)
  return { used, budget }
}

/** 분당 호출 수 제한. 세기와 기록을 DB 함수 한 번에 맡긴다. */
export async function assertRateLimit(supabase: SupabaseClient, route: string): Promise<void> {
  const limit = envNumber('RATE_LIMIT_PER_MINUTE', DEFAULT_RATE_LIMIT_PER_MINUTE)
  if (limit === 0) return
  const { data, error } = await supabase.rpc('consume_rate_limit', { p_route: route, p_max: limit })
  if (error) throw new Error(`속도 제한 확인 실패: ${error.message}`)
  if (data === false) throw new RateLimitError(limit)
}

export interface UsageEvent extends UsageInput {
  appSlug: string
  provider: 'openai' | 'google' | 'anthropic' | 'aws' | 'azure' | 'other'
  kind?: 'chat' | 'embedding' | 'stt' | 'tts' | 'image' | 'other'
}

/**
 * 호출 결과를 기록한다. user_id 는 DB 함수가 auth.uid() 로 채우므로 여기서 보내지 않는다.
 * 기록 실패가 사용자 요청을 깨뜨리지 않도록 예외를 삼키고 로그만 남긴다.
 */
export async function recordUsage(supabase: SupabaseClient, event: UsageEvent): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_usage', {
      p_app_slug: event.appSlug,
      p_provider: event.provider,
      p_model: event.model,
      p_kind: event.kind ?? 'chat',
      p_tokens_in: event.tokensIn ?? 0,
      p_tokens_out: event.tokensOut ?? 0,
      p_units: event.units ?? 0,
      p_est_cost_usd: estimateCostUsd(event),
    })
    if (error) console.error('[usage] 기록 실패:', error.message)
  } catch (err) {
    console.error('[usage] 기록 실패:', err instanceof Error ? err.message : err)
  }
}
