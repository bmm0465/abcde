# ABCDE Projects

> **A Better Class: Data & Education** — 교실 데이터·에듀테크 프로젝트 허브.
> 초등 교사의 직관과 데이터 사이언스의 정밀함이 만나 교육 현장의 난제들을 풀어 가는 과정을 기록하고, 만든 도구를 한곳에서 씁니다.

누구나 프로젝트 소개와 현장 기록(Field Notes)을 읽을 수 있습니다. AI 채점·문항 생성처럼 비용이 드는 도구는 가입 후 관리자 승인을 받은 계정으로, 월 사용 한도 안에서 씁니다.

## 담고 있는 것

| 프로젝트 | 종류 | 상태 |
|---|---|---|
| **AIDAPEL** — AI 초등영어 기초학력 진단 플랫폼 | 통합 앱 | 이식 중 (`/aidapel`) |
| **AIEEWA** — 초등 영어 서술형 문항 생성·자동 채점 | 통합 앱 | 운영 중 (`/aieewa`) |
| Teacher in the Loop — 교수행동 연습 플랫폼 | 외부 링크 | 비공개 베타 |
| 초등영어와 AI 에듀테크 — 2026-1 강의 사이트 | 외부 링크 | 운영 중 |
| AI 펭톡 데이터 분석 | 분석·글 | 완료 |

목록의 정본은 [`src/content/projects.ts`](src/content/projects.ts) 입니다.

## 구조

```
src/
  app/
    (public)/        허브 — 로그인 없이 열람. /, /projects, /notes, /about, /contact, /privacy, /account
    (auth)/          /login, /signup, /forgot, /pending
    (admin)/admin/   사용자 승인·역할·앱 접근·월 한도, 사용량
    (apps)/          통합 앱 — /aidapel/*, /aieewa/* (이식 단계에서 추가)
    auth/            /auth/callback, /auth/signout
    api/             앱별 API — 전부 src/lib/api/authorize.ts 를 거친다
  apps/              앱별 컴포넌트·로직 (앱끼리 import 하지 않는다)
  components/        셸(헤더·푸터)과 UI 프리미티브
  content/           projects.ts(레지스트리), site.ts, notes/*.md
  lib/               supabase 클라이언트, 인증 가드, 사용량·한도, 환경 변수
  proxy.ts           CSP nonce · 세션 갱신 · 보호 경로 리다이렉트
supabase/migrations/ 허브 공용 스키마 + 앱별 테이블
docs/                설계 제안, 실행 가이드, 데이터 모델, 디자인 시스템
```

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값을 채운다 — docs/01-실행-가이드.md
npm run dev
```

Supabase 프로젝트 준비, 마이그레이션 적용, 관리자 지정, Vercel 배포는 [docs/01-실행-가이드.md](docs/01-실행-가이드.md) 를 따릅니다.

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm run typecheck` · `npm run lint` | 타입 검사 · 린트(디자인 규칙 포함) |
| `npm run test:e2e` | Playwright 스모크 테스트 |
| `npm run check:secrets` | 추적 파일에 비밀값·개인정보 파일이 없는지 검사 |
| `npm run db:push` | 링크된 Supabase 프로젝트에 마이그레이션 적용 |
| `npm run admin:promote -- you@example.com` | 관리자 지정 |
| `npm run aieewa:seed` | `./corpus`(gitignore) 의 교육과정 자료를 AIEEWA 의 RAG 코퍼스로 적재 |

## 새 프로젝트 추가하기

1. `src/content/projects.ts` 에 항목을 추가한다. 소개 화면과 목록은 자동으로 생긴다.
2. 앱을 통합한다면 `src/app/(apps)/<slug>/` 에 라우트, `src/apps/<slug>/` 에 코드를 두고 `src/proxy.ts` 의 `PROTECTED_PREFIXES` 에 `/<slug>` 를 추가한다.
3. 테이블은 `supabase/migrations/` 에 `<slug>_` 접두어로 만들고 RLS 를 켠다.
4. LLM·STT 를 부르는 라우트는 `guardLlmRequest('<slug>', route)` 로 시작하고 `recordUsage()` 로 끝낸다.

## 지키는 것

- **비밀값·개인정보는 저장소에 없다.** `.env*`, PDF, 학생 명단·계정 목록·평가 결과 파일은 `.gitignore` 와 `check:secrets` 가 막는다.
- **AI 키는 서버에만.** 모든 호출은 로그인 → 권한 → 속도 제한 → 월 한도를 거친다. 최종 방어선은 RLS.
- **디자인은 린트가 강제한다.** 그라데이션·글래스·과한 라운드·장식 애니메이션 금지. [docs/03-디자인-시스템.md](docs/03-디자인-시스템.md)
- **AI 판단은 "검토 필요"로 표기한다.** 판단하는 자리에는 교사가 있다.

## 라이선스

코드는 MIT. 글과 교육 자료의 저작권은 각 작성자에게 있습니다.
