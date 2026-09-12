-- ============================================================
-- ABCDE Projects — 허브 공용 스키마
-- 프로필 · 관리자 부트스트랩 · 앱 단위 접근 · 사용량 · 속도 제한
-- 앱별 테이블은 별도 마이그레이션에 `<slug>_` 접두어로 둔다.
-- ============================================================

create extension if not exists pgcrypto;

-- ── 프로필 ─────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'guest' check (role in ('admin', 'teacher', 'student', 'guest')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  affiliation text,
  purpose text,
  -- null 이면 서버 기본값(DEFAULT_MONTHLY_BUDGET_USD). 관리자 화면에서 사람마다 덮어쓴다.
  monthly_budget_usd numeric(8, 2) check (monthly_budget_usd is null or monthly_budget_usd >= 0),
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is '허브 사용자 프로필. auth.users 와 1:1. 역할·승인 상태·월 한도.';
comment on column public.profiles.role is 'admin | teacher | student | guest — src/lib/auth/types.ts 와 같아야 한다.';
comment on column public.profiles.status is 'pending | approved | suspended';

create index profiles_status_idx on public.profiles (status, created_at desc);
create index profiles_role_idx on public.profiles (role);

-- ── 관리자 부트스트랩 ──────────────────────────────────────
-- 이 목록의 이메일은 가입 즉시 admin / approved 가 된다.
-- RLS 정책이 없으므로 service_role(스크립트·SQL 편집기)로만 편집한다.
create table public.hub_admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

comment on table public.hub_admin_emails is '가입 즉시 관리자가 되는 이메일. scripts/promote-admin.mjs 로 넣는다.';

-- ── 앱 단위 접근 ───────────────────────────────────────────
-- 역할만으로 부족할 때(특정 교사에게 특정 앱만 열기) 쓴다. app_slug 는 src/content/projects.ts 의 slug.
create table public.app_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  app_slug text not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, app_slug)
);

-- ── 사용량 ─────────────────────────────────────────────────
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  app_slug text not null,
  provider text not null,
  model text not null,
  kind text not null default 'chat' check (kind in ('chat', 'embedding', 'stt', 'tts', 'image', 'other')),
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  units numeric(12, 4) not null default 0,
  est_cost_usd numeric(10, 6) not null default 0,
  meta jsonb,
  created_at timestamptz not null default now()
);

comment on table public.usage_events is 'LLM·STT·TTS 호출 기록. 서버(service_role)만 쓴다. 월 한도 계산의 근거.';

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
create index usage_events_created_idx on public.usage_events (created_at desc);

-- ── 속도 제한 ──────────────────────────────────────────────
create table public.api_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index api_requests_user_created_idx on public.api_requests (user_id, created_at desc);

-- ── 공통 트리거: updated_at ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── 관리자 판정 ────────────────────────────────────────────
-- security definer: RLS 를 우회해 profiles 를 읽는다(정책 안에서 불러도 재귀하지 않는다).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── 가입 시 프로필 생성 ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  bootstrap_admin boolean;
begin
  select exists (
    select 1 from public.hub_admin_emails a where lower(a.email) = lower(coalesce(new.email, ''))
  ) into bootstrap_admin;

  insert into public.profiles (id, email, display_name, role, status, affiliation, purpose, approved_at)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(meta ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)), 40), ''),
    case when bootstrap_admin then 'admin' else 'guest' end,
    case when bootstrap_admin then 'approved' else 'pending' end,
    nullif(left(meta ->> 'affiliation', 80), ''),
    nullif(left(meta ->> 'purpose', 300), ''),
    case when bootstrap_admin then now() end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이메일이 바뀌면 프로필에도 반영한다.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- 프로필이 없는 계정(트리거 도입 전, 또는 실패)의 자가 복구. 호출자 본인 것만 만든다.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
begin
  if auth.uid() is null then
    return;
  end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  if not found then
    return;
  end if;
  insert into public.profiles (id, email, display_name)
  values (
    u.id,
    u.email,
    nullif(left(coalesce(u.raw_user_meta_data ->> 'display_name', split_part(coalesce(u.email, ''), '@', 1)), 40), '')
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- ── 보호 컬럼: 본인은 이름·소속·목적만 고친다 ─────────────
-- 사용자 세션(auth.uid() 있음)에서 관리자가 아니면 역할·상태·한도·승인 정보를 못 바꾼다.
-- 서버 컨텍스트(service_role, auth 시스템 트리거)는 auth.uid() 가 null 이라 통과한다.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.monthly_budget_usd is distinct from old.monthly_budget_usd
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.email is distinct from old.email then
    raise exception 'permission denied: protected profile columns' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── 이번 달 사용액 (KST 기준 달) ───────────────────────────
-- security invoker: 호출자가 볼 수 있는 행만 합산된다(본인 또는 관리자, 서버는 전부).
create or replace function public.monthly_usage_usd(uid uuid, at timestamptz default now())
returns numeric
language sql
stable
as $$
  select coalesce(sum(e.est_cost_usd), 0)
  from public.usage_events e
  where e.user_id = uid
    and e.created_at >= (date_trunc('month', at at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
    and e.created_at <  ((date_trunc('month', at at time zone 'Asia/Seoul') + interval '1 month') at time zone 'Asia/Seoul');
$$;

-- 관리자 화면용 월별 집계. security_invoker 라 usage_events 의 RLS 가 그대로 적용된다.
create view public.usage_monthly
with (security_invoker = true)
as
  select
    e.user_id,
    e.app_slug,
    (date_trunc('month', e.created_at at time zone 'Asia/Seoul'))::date as month,
    count(*)::integer as calls,
    sum(e.tokens_in)::bigint as tokens_in,
    sum(e.tokens_out)::bigint as tokens_out,
    sum(e.est_cost_usd)::numeric(12, 6) as cost_usd
  from public.usage_events e
  group by 1, 2, 3;

-- ── RLS ────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: self read" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: admin read" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: self update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- insert / delete 는 트리거와 service_role 만.

alter table public.hub_admin_emails enable row level security;
-- 정책 없음: service_role 만 읽고 쓴다.

alter table public.app_access enable row level security;
create policy "app_access: self read" on public.app_access
  for select to authenticated using (user_id = auth.uid());
create policy "app_access: admin all" on public.app_access
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.usage_events enable row level security;
create policy "usage_events: self read" on public.usage_events
  for select to authenticated using (user_id = auth.uid());
create policy "usage_events: admin read" on public.usage_events
  for select to authenticated using (public.is_admin());
-- insert 는 service_role 만 (src/lib/usage/index.ts).

alter table public.api_requests enable row level security;
-- 정책 없음: service_role 만.
