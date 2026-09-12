import Link from 'next/link'
import { Badge, type Tone } from '@/components/ui/primitives'
import {
  PROJECT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectStatus,
} from '@/content/projects'

export const STATUS_TONES: Record<ProjectStatus, Tone> = {
  active: 'ok',
  migrating: 'warn',
  beta: 'info',
  archived: 'neutral',
  planned: 'neutral',
}

/**
 * 프로젝트 장부(ledger). 카드가 아니라 행. 위에 굵은 괘선 하나.
 * 연도(모노) · 이름 · 제목과 요약 · 도장(상태·종류).
 */
export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ul className="rule-t">
      {projects.map((p) => (
        <li key={p.slug} className="border-b border-line">
          <Link
            href={`/projects/${p.slug}`}
            className="grid gap-x-6 gap-y-1.5 py-4 transition-colors duration-100 ease-out hover:bg-sunken/50 sm:grid-cols-[3.5rem_11rem_minmax(0,1fr)_auto] sm:px-2"
          >
            <span className="font-mono text-sm text-faint tabular-nums">{p.year}</span>
            <span className="font-medium">{p.name}</span>
            <span className="min-w-0">
              <span className="block">{p.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{p.summary}</span>
            </span>
            <span className="flex items-start gap-1.5 sm:justify-end">
              <Badge tone={STATUS_TONES[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
              <Badge>{PROJECT_KIND_LABELS[p.kind]}</Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
