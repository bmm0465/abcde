import 'server-only'

import { notFound, redirect } from 'next/navigation'
import { getProject, type Project } from '@/content/projects'
import { canUseProject } from '@/lib/auth/access'
import type { Profile } from '@/lib/auth/types'
import { getAppAccess, getViewer, type Viewer } from '@/lib/supabase/server'

/**
 * 데이터 접근 계층(DAL)의 문지기. 화면·서버 액션·라우트 핸들러가 첫 줄에서 부른다.
 * src/proxy.ts 는 쿠키만 보는 낙관적 검사이고, 여기서 DB 의 역할·상태로 다시 판단한다.
 */

export type ApprovedViewer = Viewer & { profile: Profile }

/** 안전한 되돌아갈 경로. 바깥 도메인으로 보내는 열린 리다이렉트를 막는다. */
export function safeNext(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`)
  return viewer
}

/** 승인된 계정만. 관리자는 상태와 무관하게 통과한다. */
export async function requireApproved(next: string): Promise<ApprovedViewer> {
  const viewer = await requireViewer(next)
  const profile = viewer.profile
  if (!profile) redirect('/pending')
  if (profile.status === 'suspended') redirect('/account?error=suspended')
  if (profile.role !== 'admin' && profile.status !== 'approved') redirect('/pending')
  return { ...viewer, profile }
}

/** 관리자만. 아니면 화면이 없는 것처럼 보인다. */
export async function requireAdmin(): Promise<ApprovedViewer> {
  const viewer = await requireViewer('/admin')
  const profile = viewer.profile
  if (!profile || profile.role !== 'admin' || profile.status !== 'approved') notFound()
  return { ...viewer, profile }
}

/** 특정 앱을 쓸 수 있는 사람만. 못 쓰는 이유에 따라 알맞은 화면으로 보낸다. */
export async function requireProjectAccess(
  slug: string,
  next: string,
): Promise<{ viewer: ApprovedViewer; project: Project }> {
  const project = getProject(slug)
  if (!project) notFound()

  const viewer = await requireViewer(next)
  const access = await getAppAccess(viewer)
  const decision = canUseProject(viewer.profile, project, access)

  if (!decision.ok) {
    switch (decision.reason) {
      case 'login':
        redirect(`/login?next=${encodeURIComponent(next)}`)
      case 'pending':
        redirect('/pending')
      case 'suspended':
        redirect('/account?error=suspended')
      case 'role':
        redirect(`/projects/${project.slug}?error=role`)
    }
  }
  if (!viewer.profile) redirect('/pending')
  return { viewer: { ...viewer, profile: viewer.profile }, project }
}
