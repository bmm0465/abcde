'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth/guards'

const schema = z
  .object({
    password: z.string().min(8, '비밀번호는 8자 이상입니다.').max(72, '비밀번호는 72자까지입니다.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: '두 비밀번호가 다릅니다.', path: ['confirm'] })

export async function updatePassword(formData: FormData): Promise<void> {
  const viewer = await requireViewer('/account/password')
  const parsed = schema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') })
  if (!parsed.success) {
    redirect(`/account/password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? '입력을 확인해 주세요.')}`)
  }

  const { error } = await viewer.supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    const message =
      error.code === 'same_password'
        ? '지금 쓰는 비밀번호와 같습니다.'
        : error.code === 'weak_password'
          ? '더 긴 비밀번호를 써 주세요.'
          : '비밀번호를 바꾸지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'
    redirect(`/account/password?error=${encodeURIComponent(message)}`)
  }

  redirect(`/account?notice=${encodeURIComponent('비밀번호를 바꿨습니다.')}`)
}
