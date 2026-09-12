import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-site flex-1 flex-col items-start justify-center px-5 py-16">
        <p className="text-caption text-faint">404</p>
        <h1 className="mt-1 text-title font-normal tracking-tight">그런 화면이 없습니다</h1>
        <p className="mt-2 max-w-prose text-base text-muted">
          주소가 바뀌었거나 아직 만들지 않은 화면입니다. 이식 중인 앱이라면 프로젝트 소개에서 기존 배포 링크를
          찾을 수 있습니다.
        </p>
        <div className="mt-6 flex gap-2">
          <ButtonLink href="/" variant="primary">
            첫 화면으로
          </ButtonLink>
          <ButtonLink href="/projects">프로젝트</ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
