import type { Metadata } from 'next'
import { ProjectList } from '@/components/project-list'
import { PageHeader } from '@/components/ui/primitives'
import { projects } from '@/content/projects'

export const metadata: Metadata = { title: '프로젝트' }

export default function ProjectsPage() {
  const sorted = [...projects].sort((a, b) => b.year - a.year)
  return (
    <>
      <PageHeader
        title="프로젝트"
        description="교실에서 시작된 문제를 데이터와 코드로 풀어 본 기록입니다. 소개는 누구나 볼 수 있고, 도구 사용은 계정 종류에 따라 열립니다."
      />
      <ProjectList projects={sorted} />
    </>
  )
}
