import 'server-only'

import { NextResponse } from 'next/server'
import { getProject, type Project } from '@/content/projects'
import { ACCESS_REASON_LABELS, canUseProject } from '@/lib/auth/access'
import type { ApprovedViewer } from '@/lib/auth/guards'
import { getAppAccess, getViewer } from '@/lib/supabase/server'
import { assertRateLimit, assertWithinBudget, RateLimitError, UsageLimitError } from '@/lib/usage'

/**
 * 라우트 핸들러(/api/**) 용 문지기.
 *
 *   const auth = await authorizeApi('aieewa')
 *   if (auth instanceof NextResponse) return auth
 *   // auth.viewer, auth.project
 *
 * LLM 을 부르는 라우트는 guardLlmRequest 를 쓴다 — 속도 제한과 월 한도까지 본다.
 */

export interface ApiAuth {
  viewer: ApprovedViewer
  project: Project
}

export function apiError(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status })
}

export async function authorizeApi(projectSlug: string): Promise<ApiAuth | NextResponse> {
  const project = getProject(projectSlug)
  if (!project) return apiError(404, '알 수 없는 앱입니다.', 'unknown_app')

  const viewer = await getViewer()
  if (!viewer) return apiError(401, '로그인이 필요합니다.', 'unauthenticated')
  if (!viewer.profile) return apiError(403, '프로필이 아직 준비되지 않았습니다.', 'no_profile')

  const access = await getAppAccess(viewer)
  const decision = canUseProject(viewer.profile, project, access)
  if (!decision.ok) return apiError(403, ACCESS_REASON_LABELS[decision.reason], decision.reason)

  return { viewer: { ...viewer, profile: viewer.profile }, project }
}

export async function guardLlmRequest(projectSlug: string, route: string): Promise<ApiAuth | NextResponse> {
  const auth = await authorizeApi(projectSlug)
  if (auth instanceof NextResponse) return auth
  try {
    await assertRateLimit(auth.viewer.user.id, route)
    await assertWithinBudget(auth.viewer.profile)
  } catch (err) {
    if (err instanceof RateLimitError) return apiError(429, err.message, 'rate_limited')
    if (err instanceof UsageLimitError) return apiError(429, err.message, 'budget_exceeded')
    console.error('[api] 한도 확인 실패:', err instanceof Error ? err.message : err)
    return apiError(503, '지금은 요청을 처리할 수 없습니다. 잠시 후 다시 해 주세요.', 'limit_check_failed')
  }
  return auth
}
