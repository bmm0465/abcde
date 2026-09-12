'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth/guards'

const schema = z.object({
  display_name: z.string().trim().min(1, '이름을 적어 주세요.').max(40, '이름은 40자까지입니다.'),
  affiliation: z.string().trim().max(80, '소속은 80자까지입니다.'),
  purpose: z.string().trim().max(300, '사용 목적은 300자까지입니다.'),
})

export async function updateProfile(formData: FormData): Promise<void> {
  const viewer = await requireViewer('/account')
  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
    affiliation: formData.get('affiliation') ?? '',
    purpose: formData.get('purpose') ?? '',
  })
  if (!parsed.success) {
    redirect(`/account?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.')}`)
  }

  // 사용자 세션으로 쓴다 → RLS(본인 행) + 트리거(보호 컬럼) 가 지킨다.
  const { error } = await viewer.supabase
    .from('profiles')
    .update({
      display_name: parsed.data.display_name,
      affiliation: parsed.data.affiliation || null,
      purpose: parsed.data.purpose || null,
    })
    .eq('id', viewer.user.id)

  if (error) redirect(`/account?error=${encodeURIComponent('저장하지 못했습니다. 잠시 후 다시 해 주세요.')}`)

  revalidatePath('/account')
  redirect(`/account?notice=${encodeURIComponent('저장했습니다.')}`)
}
