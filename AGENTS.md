<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ABCDE Projects — 작업 규칙

한국어로 소통하고 주석·문서도 한국어로 쓴다. 프로젝트명·태그라인만 영문.

## 구조와 경계

- 허브 셸: `src/app/(public)`, `(auth)`, `(admin)`, `src/components`, `src/lib`.
- 통합 앱: `src/app/(apps)/<slug>/` + `src/apps/<slug>/`. 앱끼리 서로 import 하지 않는다. 공용은 `src/lib`.
- 프로젝트 목록의 정본은 `src/content/projects.ts`. 여기 없는 앱은 없는 것이다.
- Next 16: `src/proxy.ts`(middleware 아님), `params`/`searchParams` 는 Promise, 라우트 핸들러의 `params` 도 Promise.

## 인증·권한 (지키지 않으면 비용이 샌다)

- 화면: `requireViewer / requireApproved / requireAdmin / requireProjectAccess` (`src/lib/auth/guards.ts`) 를 첫 줄에서.
- API 라우트: `authorizeApi(slug)` 또는 LLM 이면 `guardLlmRequest(slug, route)` (`src/lib/api/authorize.ts`). 호출 뒤 `recordUsage()`.
- 서버 액션도 스스로 인가한다. 레이아웃은 이동 시 재실행되지 않으므로 레이아웃에서 인가하지 않는다.
- `createAdminClient()`(service_role) 는 사용량 기록·관리자 스크립트에만. 일반 읽기·쓰기는 사용자 세션 + RLS.
- 서버 로그에 이메일·이름·ID 를 찍지 않는다.

## 디자인 (린트가 막는다) — "교실의 연구 노트", docs/03

- 흰 종이(bg·surface 둘 다 `#fff`)·잉크(text)·칠판 녹색(accent, 하나)·붉은 연필(mark, 표시에만). 채움이 필요하면 `sunken`. 제목은 명조(`font-serif`), 본문은 Plex Sans, 날짜·숫자·라벨은 모노(`font-mono`, `label-mono`).
- 위계는 괘선으로: 표·목록 머리에 `rule-t` 하나, 행 사이 `hairline-b`. 카드 대신 행.
- 토큰은 `src/app/globals.css` 의 `@theme` 만. Tailwind 기본 색 이름(`bg-blue-500` 등)은 빌드가 깨진다.
- 금지: 그라데이션, 글래스(backdrop-blur), `rounded-xl` 이상, 정적 요소의 그림자, `animate-*`, 제목 이모지, 히어로+3열 카드.
- 부품은 `src/components/ui/*` 를 먼저 쓴다. 표는 가로선만, 숫자는 우측 정렬 `tabular-nums`.
- 상태 화면 4종(로딩·빈·오류·권한 없음)은 `primitives.tsx` 의 것을 쓴다. "이런! 문제가 생겼어요 😅" 금지.
- 한글: `word-break: keep-all`, 행간 1.7, 굵기 400/500/600 만.
- 이식된 레거시 앱(`src/app/(apps)/**`)은 1차에서 동작 보존이 우선이라 린트 예외다. 2차에서 정리한다.

## 저장소 (공개다)

- `.env*`, PDF, 학생 명단·계정 목록·평가 결과(xlsx/csv) 는 절대 추적하지 않는다. `npm run check:secrets`.
- 커밋·푸시는 사용자가 요청할 때만.
