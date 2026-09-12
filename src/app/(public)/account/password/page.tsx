import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { ErrorState, PageHeader } from '@/components/ui/primitives'
import { requireViewer } from '@/lib/auth/guards'
import { updatePassword } from './actions'

export const metadata: Metadata = { title: '비밀번호 변경' }

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  await requireViewer('/account/password')

  return (
    <>
      <PageHeader back={{ href: '/account', label: '내 계정' }} title="비밀번호 변경" />
      {error && (
        <div className="mb-6 max-w-sm">
          <ErrorState message={error} />
        </div>
      )}
      <form action={updatePassword} className="flex max-w-sm flex-col gap-4">
        <Field id="password" label="새 비밀번호" hint="8자 이상.">
          <Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" autoFocus />
        </Field>
        <Field id="confirm" label="새 비밀번호 확인">
          <Input id="confirm" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        </Field>
        <div>
          <Button type="submit" variant="primary">
            바꾸기
          </Button>
        </div>
      </form>
    </>
  )
}
