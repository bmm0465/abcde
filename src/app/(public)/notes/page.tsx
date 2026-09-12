import type { Metadata } from 'next'
import { NoteList } from '@/components/note-list'
import { PageHeader } from '@/components/ui/primitives'
import { getNotes } from '@/lib/notes'

export const metadata: Metadata = { title: 'Field Notes' }

export default async function NotesPage() {
  const notes = await getNotes()
  return (
    <>
      <PageHeader
        eyebrow="Field Notes"
        title="기록"
        description="완성된 결과물 이면의 고민과 작은 발견을 적습니다. 교실 속 데이터 이야기."
      />
      <NoteList notes={notes} />
    </>
  )
}
