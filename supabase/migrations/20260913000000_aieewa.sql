-- ============================================================
-- AIEEWA — 초등 영어 서술형 평가 문항 생성·자동 채점
--
-- 표 이름은 모두 `aieewa_` 로 시작한다(docs/02 §1).
-- 소유자는 문항을 만든 교사다. 교사는 자기 것만 보고, 관리자는 전부 본다.
-- RAG 코퍼스(교과서·성취기준 청크)는 시드 스크립트로만 들어오며 저장소에는 없다.
-- ============================================================

-- 벡터 검색과 키워드 백업. 대시보드에서 이미 켰다면 아무 일도 하지 않는다.
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ── RAG 코퍼스 ─────────────────────────────────────────────
create table public.aieewa_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- 파일명이나 출처 표기. 저작권 자료의 본문은 여기 없고 청크로만 들어간다.
  source text,
  kind text not null default 'reference'
    check (kind in ('textbook', 'standard', 'rubric', 'reference')),
  chunk_count integer not null default 0,
  -- 공용 코퍼스(관리자가 시드한 것)는 승인된 사용자 모두가 검색에 쓴다.
  is_shared boolean not null default true,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.aieewa_documents is
  'AIEEWA RAG 코퍼스의 원본 문서 목록. 본문은 청크 표에만 있다. 시드는 scripts/aieewa-seed-corpus.mjs.';

create table public.aieewa_document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.aieewa_documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  -- text-embedding-3-small 의 차원. 모델을 바꾸면 이 표를 새로 만들어야 한다.
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index aieewa_chunks_document_idx on public.aieewa_document_chunks (document_id);
-- hnsw 를 쓴다. ivfflat 은 빈 표에 만들면 군집이 비어 있어 데이터를 넣은 뒤에도
-- 검색이 아무것도 못 찾는다. hnsw 는 행이 들어올 때마다 색인이 자라므로 이 문제가 없다.
create index aieewa_chunks_embedding_idx on public.aieewa_document_chunks
  using hnsw (embedding vector_cosine_ops);
-- 벡터 검색이 실패했을 때의 키워드 백업용
create index aieewa_chunks_content_trgm_idx on public.aieewa_document_chunks
  using gin (content gin_trgm_ops);

-- ── 생성된 문항 ────────────────────────────────────────────
create table public.aieewa_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- 교사가 넣은 요청 원문. 재현성을 위해 남긴다.
  request text not null,
  grade_unit text not null,
  passage text not null,
  prompt text not null,
  conditions text not null,
  -- 모범 답안 2개
  model_answers text[] not null,
  -- 분석적 채점 기준 3개: 과제 수행 · 내용 구성 · 언어 사용 정확성 순
  analytic_criteria text[] not null,
  -- {"A": "...", "B": "...", "C": "..."}
  holistic_criteria jsonb not null,
  level_answers jsonb not null,
  level_feedback jsonb not null,
  -- 재현성 스탬프: 어떤 모델이, 문서에 얼마나 근거해 만들었는가
  model text not null,
  grounding_score smallint check (grounding_score between 1 and 4),
  context_chunks integer not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.aieewa_questions.grounding_score is
  '문맥-답안 관련성 자기검증 점수 1~4. 3 이상이면 문서에 근거한 것으로 본다. null 이면 검증을 건너뛴 것.';

create index aieewa_questions_owner_idx on public.aieewa_questions (owner_id, created_at desc);

-- ── 채점된 답안 ────────────────────────────────────────────
create table public.aieewa_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.aieewa_questions (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- 학생 식별표. 실명 대신 번호나 별칭을 쓰도록 화면에서 안내한다(개인정보 최소 수집).
  student_label text not null,
  answer text not null,
  mode text not null check (mode in ('standard', 'aas')),

  score_task smallint not null check (score_task between 0 and 2),
  score_organization smallint not null check (score_organization between 0 and 2),
  score_language smallint not null check (score_language between 0 and 2),
  -- 채점 근거는 aas 모드에서만 채워진다
  reason_task text,
  reason_organization text,
  reason_language text,
  total_score smallint not null check (total_score between 0 and 6),
  holistic text not null check (holistic in ('A', 'B', 'C')),
  feedback text not null,
  -- 교사가 덧붙이거나 고쳐 쓰는 자리. AI 채점은 언제나 검토 대상이다.
  teacher_feedback text,

  -- aas 자기검증 점수 1~4
  accuracy_score smallint check (accuracy_score between 1 and 4),
  feedback_score smallint check (feedback_score between 1 and 4),
  model text not null,
  created_at timestamptz not null default now()
);

create index aieewa_answers_question_idx on public.aieewa_answers (question_id, created_at desc);
create index aieewa_answers_owner_idx on public.aieewa_answers (owner_id, created_at desc);

-- ── 벡터 검색 ──────────────────────────────────────────────
-- security invoker(기본): 호출자가 볼 수 있는 청크만 검색된다.
create or replace function public.aieewa_match_chunks(
  query_embedding vector(1536),
  match_count integer default 8,
  similarity_threshold double precision default 0.55
)
returns table (content text, document_title text, similarity double precision)
language sql
stable
as $$
  select
    c.content,
    d.title as document_title,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.aieewa_document_chunks c
  join public.aieewa_documents d on d.id = c.document_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 40);
$$;

grant execute on function public.aieewa_match_chunks(vector, integer, double precision)
  to authenticated, service_role;

-- ── RLS ────────────────────────────────────────────────────
alter table public.aieewa_documents enable row level security;

-- 승인된 사용자만 코퍼스를 본다. is_admin() 은 허브 마이그레이션에 있다.
create policy "aieewa_documents: read shared or own" on public.aieewa_documents
  for select to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or (
      is_shared
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.status = 'approved'
      )
    )
  );

create policy "aieewa_documents: admin write" on public.aieewa_documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.aieewa_document_chunks enable row level security;

-- 청크는 부모 문서가 보이면 보인다. 쓰기는 service_role(시드 스크립트)만.
create policy "aieewa_chunks: follow document" on public.aieewa_document_chunks
  for select to authenticated
  using (
    exists (
      select 1 from public.aieewa_documents d
      where d.id = document_id
    )
  );

alter table public.aieewa_questions enable row level security;

create policy "aieewa_questions: owner all" on public.aieewa_questions
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "aieewa_questions: admin read" on public.aieewa_questions
  for select to authenticated using (public.is_admin());

alter table public.aieewa_answers enable row level security;

create policy "aieewa_answers: owner all" on public.aieewa_answers
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "aieewa_answers: admin read" on public.aieewa_answers
  for select to authenticated using (public.is_admin());
