import type { Role } from '@/lib/auth/types'

/**
 * ★ 프로젝트 레지스트리 — 이 파일이 카탈로그·내비·권한 게이트의 정본이다.
 *
 * 새 프로젝트를 추가할 때:
 *   1. 여기 항목 하나를 추가한다.
 *   2. kind 가 'integrated' 면 src/app/(apps)/<slug>/ 에 라우트를, src/apps/<slug>/ 에 코드를 둔다.
 *      src/proxy.ts 의 PROTECTED_PREFIXES 에 '/<slug>' 를 추가한다.
 *   3. DB 가 필요하면 supabase/migrations 에 `<slug>_` 접두어 테이블로 마이그레이션을 추가한다.
 *   4. LLM·STT 호출은 반드시 src/lib/api/authorize.ts 의 guardLlmRequest 를 거친다.
 */

export type ProjectKind =
  /** 이 앱 안에서 동작한다 */
  | 'integrated'
  /** 별도 배포. 링크만 건다 */
  | 'external'
  /** 코드가 아니라 분석·보고서. 글로 읽는다 */
  | 'article'

export type ProjectStatus = 'active' | 'migrating' | 'beta' | 'archived' | 'planned'

/** 도구를 실제로 '사용'할 수 있는 조건. 소개 화면은 언제나 공개다. */
export type UseAccess = 'public' | 'login' | Role[]

export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  slug: string
  /** 짧은 이름 (AIDAPEL) */
  name: string
  /** 풀어 쓴 제목 */
  title: string
  /** 한 줄 요약 — 목록에 쓴다 */
  summary: string
  /** 문단 단위 설명 */
  description: string[]
  kind: ProjectKind
  status: ProjectStatus
  year: number
  tags: string[]
  use: UseAccess
  /** integrated: 앱 안의 경로. external: 바깥 URL */
  entry?: string
  features?: string[]
  stack?: string[]
  links?: ProjectLink[]
  /** src/content/notes 의 slug */
  relatedNotes?: string[]
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: '운영 중',
  migrating: '이식 중',
  beta: '비공개 베타',
  archived: '완료',
  planned: '계획',
}

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  integrated: '통합 앱',
  external: '외부 사이트',
  article: '분석·글',
}

export const projects: Project[] = [
  {
    slug: 'aidapel',
    name: 'AIDAPEL',
    title: 'AI 초등영어 기초학력 진단 플랫폼',
    summary:
      'DIBELS 8th 기반 6단계 진단 평가를 웹으로 구현하고, 음성 응답을 STT·LLM 으로 채점해 교사에게 돌려준다.',
    description: [
      'AI Diagnostic Assessment Platform for Primary English Literacy. 알파벳 인식부터 대화 이해까지 여섯 교시로 나뉜 진단 평가를 학생이 태블릿에서 응시하고, 음성 응답은 전사 모델로 텍스트가 된 뒤 LLM 이 정확도와 피드백을 매긴다.',
      '교사 대시보드에서 학급 전체와 학생별 결과, 전사 모델별 신뢰도를 비교하고 Excel 로 내보낸다. 2025년 2학기 세 학교 학급에서 시범 운영했다.',
    ],
    kind: 'integrated',
    status: 'migrating',
    year: 2025,
    tags: ['DIBELS', 'STT', 'LLM', 'Supabase'],
    use: ['teacher', 'student'],
    entry: '/aidapel',
    features: [
      '6교시 진단 평가(알파벳 · 분절 음소 · 초분절 음소 · 파닉스 · 어휘 · 이해)',
      '음성 응답 저장과 다중 STT(OpenAI · Gemini · AWS · Azure) 전사 비교',
      'LLM 채점과 Hattie 피드백 모형 기반 개별 피드백',
      '교사 대시보드 · 학생 상세 · 전사 정확도 검토 · Excel 내보내기',
      '교육과정 PDF 기반 문항 자동 생성과 검토 승인 워크플로',
    ],
    stack: ['Next.js', 'React', 'Supabase (Auth · DB · Storage)', 'OpenAI', 'Google Gemini', 'AWS Transcribe'],
    links: [
      { label: 'GitHub 저장소', href: 'https://github.com/bmm0465/AIDAPEL' },
      {
        label: '개발 보고서',
        href: 'https://github.com/bmm0465/AIDAPEL/blob/main/AI_초등영어_기초학력_진단_플랫폼_개발_보고서.md',
      },
      { label: '기존 배포(이식 전)', href: 'https://aieebss.vercel.app' },
    ],
  },
  {
    slug: 'aieewa',
    name: 'AIEEWA',
    title: '초등 영어 서술형 평가 문항 생성·자동 채점',
    summary:
      'RAG 로 교육과정에 맞는 서술형 문항과 채점 기준을 만들고, 학생 답안을 LLM-as-a-Judge 로 채점해 피드백을 준다.',
    description: [
      '교과서와 성취기준 문서를 벡터 검색해 5~6학년 영어 서술형 문항, 모범 답안, 분석적·총체적 채점 기준, 성취수준별 예시 답안과 피드백을 한 세트로 생성한다. Self-RAG 로 생성물의 품질을 스스로 검증한다.',
      '답안 평가는 과제 수행 · 내용 구성 · 언어 사용 세 영역의 분석적 채점과 A·B·C 총체적 채점을 함께 매기고, 교사 채점 예시를 few-shot 으로 넣은 AAS 모드에서는 항목별 채점 근거를 함께 적는다.',
    ],
    kind: 'integrated',
    status: 'migrating',
    year: 2025,
    tags: ['RAG', 'LLM-as-a-Judge', 'pgvector'],
    use: ['teacher'],
    entry: '/aieewa',
    features: [
      'RAG 기반 문항 생성(AQG) 과 Self-RAG 품질 검증',
      '분석적 3영역 + 총체적 A/B/C 채점',
      '교사 채점 예시 few-shot 을 활용한 AAS 자동 채점과 채점 근거',
      '성취수준별 맞춤 피드백',
    ],
    stack: ['Next.js', 'Supabase (pgvector)', 'OpenAI'],
  },
  {
    slug: 'loop',
    name: 'Teacher in the Loop',
    title: '근거 기반 교수행동 연습 플랫폼',
    summary:
      '예비 초등영어교사가 AI 로 수업 자료를 만들고, 체크리스트로 검증하고, 실연·피드백·재수행을 기록하는 강의 도구.',
    description: [
      '2026학년도 2학기 청주교대 교실영어실습 강의에서 쓰는 도구다. 생성 → 검증 → 실연 → 피드백 → 재수행의 순환을 기록하며, 성과 지표는 AI 생성량이 아니라 근거 확인과 재수행이다.',
      '수강생 계정으로만 들어갈 수 있다. 강의가 끝나면 공개 범위를 다시 정한다.',
    ],
    kind: 'external',
    status: 'beta',
    year: 2026,
    tags: ['교사교육', 'Claude', 'Supabase'],
    use: 'public',
    entry: 'https://mdg-new.vercel.app',
  },
  {
    slug: 'cje-ai-english-2026',
    name: '초등영어와 AI 에듀테크',
    title: '2026-1 청주교대 강의 사이트',
    summary: '영어교육과 3학년 강의 자료와 실습 아카이브. 수강생 로그인, 자료 내려받기, 과제 제출.',
    description: [
      '2026학년도 1학기 강의 웹사이트. 강의 자료와 실습 결과를 모아 두었고, 과제 제출 기능의 뼈대가 있다.',
    ],
    kind: 'external',
    status: 'active',
    year: 2026,
    tags: ['강의', 'Next.js', 'Supabase'],
    use: 'public',
    entry: 'https://2026-spring-cje-ai-english.vercel.app',
    links: [{ label: 'GitHub 저장소', href: 'https://github.com/bmm0465/2026-spring-cje-ai-english' }],
  },
  {
    slug: 'pengtalk-analysis',
    name: 'AI 펭톡 데이터 분석',
    title: 'AI 펭톡 영어 평가 데이터 분석',
    summary:
      '분산 연습 기법을 적용한 수업 모형의 효과를 검증하기 위해 6학년 학습 로그를 수집·시각화했다. 저성취 학생에게서 뚜렷한 효과가 나타났다.',
    description: [
      'EBS AI 펭톡의 학습 로그를 학급 단위로 모아 분산 연습(spaced practice) 수업 모형 전후를 비교했다. 전체 평균보다 저성취 학생 집단의 향상 폭이 컸다.',
    ],
    kind: 'article',
    status: 'archived',
    year: 2025,
    tags: ['데이터 분석', '시각화', 'Python'],
    use: 'public',
  },
]

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export function integratedProjects(): Project[] {
  return projects.filter((p) => p.kind === 'integrated')
}
