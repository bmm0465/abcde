import type { Project } from '@/content/projects'
import type { Profile } from '@/lib/auth/types'

/**
 * 도구 사용 권한 판단. 순수 함수 — 화면과 API 가 같은 규칙을 쓴다.
 *
 * 순서가 곧 정책이다:
 *   공개 도구 → 누구나
 *   미로그인 → 로그인
 *   정지 계정 → 차단
 *   관리자 → 전부
 *   승인 대기 → 대기 안내
 *   'login' 도구 → 승인된 누구나
 *   역할 목록 → 역할이 맞거나 앱 단위로 열어 준 사람
 */

export type AccessProfile = Pick<Profile, 'role' | 'status'>

export type AccessDecision =
  | { ok: true }
  | { ok: false; reason: 'login' | 'suspended' | 'pending' | 'role' }

export const ACCESS_REASON_LABELS: Record<Exclude<AccessDecision, { ok: true }>['reason'], string> = {
  login: '로그인이 필요합니다.',
  suspended: '이 계정은 정지되었습니다. 문의해 주세요.',
  pending: '가입은 되었지만 아직 승인되지 않았습니다. 관리자 승인 후 사용할 수 있습니다.',
  role: '이 도구는 지정된 역할에게만 열려 있습니다. 필요하면 관리자에게 요청하세요.',
}

export function canUseProject(
  profile: AccessProfile | null,
  project: Project,
  appAccess: readonly string[] = [],
): AccessDecision {
  if (project.use === 'public') return { ok: true }
  if (!profile) return { ok: false, reason: 'login' }
  if (profile.status === 'suspended') return { ok: false, reason: 'suspended' }
  if (profile.role === 'admin') return { ok: true }
  if (profile.status !== 'approved') return { ok: false, reason: 'pending' }
  if (project.use === 'login') return { ok: true }
  if (project.use.includes(profile.role)) return { ok: true }
  if (appAccess.includes(project.slug)) return { ok: true }
  return { ok: false, reason: 'role' }
}

/** 소개 화면의 접근 표기. 짧게. */
export function describeUseAccess(project: Project): string {
  if (project.kind === 'external') return '외부 사이트 · 별도 계정'
  if (project.kind === 'article') return '공개'
  if (project.use === 'public') return '공개'
  if (project.use === 'login') return '로그인 · 승인 필요'
  const names = project.use.map((r) => ({ admin: '관리자', teacher: '교사', student: '학생', guest: '둘러보기' })[r])
  return `${names.join(' · ')} 계정`
}
