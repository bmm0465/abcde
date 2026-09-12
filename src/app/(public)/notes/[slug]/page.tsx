import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Markdown } from '@/components/markdown'
import { Badge, PageHeader } from '@/components/ui/primitives'
import { formatDate, getNote } from '@/lib/notes'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const note = await getNote(slug)
  return note ? { title: note.title, description: note.summary } : {}
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params
  const note = await getNote(slug)
  if (!note) notFound()

  return (
    <article>
      <PageHeader
        back={{ href: '/notes', label: '기록' }}
        eyebrow={formatDate(note.date)}
        title={note.title}
        actions={<Badge>{note.category}</Badge>}
      />
      <Markdown source={note.body} />
    </article>
  )
}
