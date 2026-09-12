import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-site flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </>
  )
}
