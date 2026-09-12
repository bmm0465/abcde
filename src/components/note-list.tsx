import Link from 'next/link'
import { Badge, EmptyState } from '@/components/ui/primitives'
import { formatDate, type Note } from '@/lib/notes'

/** 기록 목차(index). 날짜는 모노, 제목은 명조. */
export function NoteList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <EmptyState message="아직 올린 기록이 없습니다." />
  }
  return (
    <ul className="rule-t">
      {notes.map((n) => (
        <li key={n.slug} className="border-b border-line">
          <Link
            href={`/notes/${n.slug}`}
            className="grid gap-x-6 gap-y-1 py-4 transition-colors duration-100 ease-out hover:bg-sunken/50 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:px-2"
          >
            <span className="font-mono text-sm text-faint tabular-nums">{formatDate(n.date)}</span>
            <span className="min-w-0">
              <span className="block font-serif text-lg font-semibold tracking-snug">{n.title}</span>
              <span className="mt-1 block text-sm text-muted">{n.summary}</span>
            </span>
            <Badge className="self-start">{n.category}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  )
}
