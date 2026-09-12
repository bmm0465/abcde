/** supabase/migrations 의 profiles 테이블과 1:1. 여기와 SQL 의 check 제약이 같아야 한다. */

export const ROLES = ['admin', 'teacher', 'student', 'guest'] as const
export type Role = (typeof ROLES)[number]

export const PROFILE_STATUSES = ['pending', 'approved', 'suspended'] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  role: Role
  status: ProfileStatus
  affiliation: string | null
  purpose: string | null
  monthly_budget_usd: number | null
  approved_at: string | null
  created_at: string
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: '관리자',
  teacher: '교사',
  student: '학생',
  guest: '둘러보기',
}

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  pending: '승인 대기',
  approved: '승인됨',
  suspended: '정지',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isProfileStatus(value: unknown): value is ProfileStatus {
  return typeof value === 'string' && (PROFILE_STATUSES as readonly string[]).includes(value)
}
