'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { integratedProjects } from '@/content/projects'
import { requireAdmin } from '@/lib/auth/guards'
import { PROFILE_STATUSES, ROLES } from '@/lib/auth/types'

/**
 * 관리자 서버 액션. 전부 requireAdmin() 으로 시작하고, 쓰기는 관리자 세션(RLS 관리자 정책)으로 한다.
 * service_role 을 쓰지 않는 이유: DB 가 한 번 더 관리자인지 확인하게 하려고.
 */

function done(message: string): never {
  redirect(`/admin?notice=${encodeURIComponent(message)}`)
}

function fail(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`)
}

const idSchema = z.uuid()
const roleSchema = z.enum(ROLES)
const statusSchema = z.enum(PROFILE_STATUSES)

export async function approveUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = idSchema.safeParse(formData.get('id'))
  const role = roleSchema.safeParse(formData.get('role') ?? 'teacher')
  if (!id.success || !role.success) fail('요청 값이 올바르지 않습니다.')

  const { error } = await admin.supabase
    .from('profiles')
    .update({ role: role.data, status: 'approved', approved_at: new Date().toISOString(), approved_by: admin.user.id })
    .eq('id', id.data)
  if (error) fail(`승인하지 못했습니다: ${error.message}`)

  revalidatePath('/admin')
  done('승인했습니다.')
}

export async function suspendUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = idSchema.safeParse(formData.get('id'))
  if (!id.success) fail('요청 값이 올바르지 않습니다.')
  if (id.data === admin.user.id) fail('자기 자신은 정지할 수 없습니다.')

  const { error } = await admin.supabase.from('profiles').update({ status: 'suspended' }).eq('id', id.data)
  if (error) fail(`정지하지 못했습니다: ${error.message}`)

  revalidatePath('/admin')
  done('정지했습니다.')
}

const saveSchema = z.object({
  id: idSchema,
  role: roleSchema,
  status: statusSchema,
  budget: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(z.number().min(0).max(10_000).nullable()),
})

export async function saveUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = saveSchema.safeParse({
    id: formData.get('id'),
    role: formData.get('role'),
    status: formData.get('status'),
    budget: formData.get('budget') ?? '',
  })
  if (!parsed.success) fail('요청 값이 올바르지 않습니다.')
  const { id, role, status, budget } = parsed.data

  if (id === admin.user.id && (role !== 'admin' || status !== 'approved')) {
    fail('자기 자신의 관리자 권한은 여기서 내릴 수 없습니다.')
  }

  const patch: Record<string, unknown> = { role, status, monthly_budget_usd: budget }
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString()
    patch.approved_by = admin.user.id
  }
  const { error } = await admin.supabase.from('profiles').update(patch).eq('id', id)
  if (error) fail(`저장하지 못했습니다: ${error.message}`)

  // 앱 단위 접근: 체크된 것만 남긴다.
  const wanted = new Set(
    formData
      .getAll('access')
      .map(String)
      .filter((slug) => integratedProjects().some((p) => p.slug === slug)),
  )
  const { data: current } = await admin.supabase.from('app_access').select('app_slug').eq('user_id', id)
  const have = new Set((current ?? []).map((r) => r.app_slug as string))

  const toAdd = [...wanted].filter((s) => !have.has(s))
  const toRemove = [...have].filter((s) => !wanted.has(s))
  if (toAdd.length > 0) {
    const { error: addError } = await admin.supabase
      .from('app_access')
      .insert(toAdd.map((app_slug) => ({ user_id: id, app_slug, granted_by: admin.user.id })))
    if (addError) fail(`앱 접근을 저장하지 못했습니다: ${addError.message}`)
  }
  if (toRemove.length > 0) {
    const { error: removeError } = await admin.supabase
      .from('app_access')
      .delete()
      .eq('user_id', id)
      .in('app_slug', toRemove)
    if (removeError) fail(`앱 접근을 저장하지 못했습니다: ${removeError.message}`)
  }

  revalidatePath('/admin')
  done('저장했습니다.')
}
