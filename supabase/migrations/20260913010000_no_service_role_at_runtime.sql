-- ============================================================
-- 배포된 앱에서 service_role 키를 없앤다
--
-- 이 Supabase 프로젝트는 AIDAPEL(초등 영어 기초학력 진단) 파일럿과 함께 쓴다.
-- 그 스키마에는 초등학생의 이름과 음성 녹음이 들어 있다. service_role 키는
-- 프로젝트 단위라 키가 하나 새면 그 데이터까지 전부 열린다.
--
-- 그래서 런타임에 service_role 이 필요했던 두 가지를 security definer 함수로 바꾼다.
-- 이 함수들은 auth.uid() 로 고정된 본인 행만 건드리므로, 사용자 세션만으로 충분하다.
-- 결과: Vercel 환경 변수에 SUPABASE_SERVICE_ROLE_KEY 를 넣지 않아도 앱이 돈다.
-- 남은 service_role 사용처는 로컬 스크립트 둘뿐이다(관리자 지정, 코퍼스 시드).
-- ============================================================

-- 음수 비용으로 한도를 되돌리는 것을 막는다.
alter table public.usage_events
  add constraint usage_events_cost_nonneg check (est_cost_usd >= 0);

-- ── 사용량 기록 ────────────────────────────────────────────
-- 서버 라우트가 LLM 호출 뒤에 부른다. user_id 는 인자로 받지 않는다 —
-- 언제나 호출자 자신이다. 남의 이름으로 기록을 남길 방법이 없다.
create or replace function public.record_usage(
  p_app_slug text,
  p_provider text,
  p_model text,
  p_kind text,
  p_tokens_in integer,
  p_tokens_out integer,
  p_units numeric,
  p_est_cost_usd numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.usage_events (
    user_id, app_slug, provider, model, kind, tokens_in, tokens_out, units, est_cost_usd
  )
  values (
    auth.uid(),
    left(p_app_slug, 60),
    left(p_provider, 30),
    left(p_model, 120),
    coalesce(nullif(p_kind, ''), 'chat'),
    -- 음수를 넣어 한도를 깎는 것을 막는다.
    greatest(coalesce(p_tokens_in, 0), 0),
    greatest(coalesce(p_tokens_out, 0), 0),
    greatest(coalesce(p_units, 0), 0),
    greatest(coalesce(p_est_cost_usd, 0), 0)
  );
end;
$$;

revoke all on function public.record_usage(text, text, text, text, integer, integer, numeric, numeric) from public, anon;
grant execute on function public.record_usage(text, text, text, text, integer, integer, numeric, numeric) to authenticated;

-- ── 속도 제한 ──────────────────────────────────────────────
-- 최근 1분 안의 호출 수를 세고, 한도 안이면 한 건 기록하고 true 를 준다.
-- 세기와 기록이 한 함수 안에 있어야 두 요청이 동시에 통과하는 틈이 줄어든다.
create or replace function public.consume_rate_limit(p_route text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select count(*) into recent
  from public.api_requests
  where user_id = auth.uid()
    and created_at >= now() - interval '1 minute';

  if recent >= greatest(p_max, 1) then
    return false;
  end if;

  insert into public.api_requests (user_id, route) values (auth.uid(), left(p_route, 200));
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer) to authenticated;

-- ── 오래된 속도 제한 기록 치우기 ───────────────────────────
-- api_requests 는 1분 창에만 쓰이므로 하루 지난 것은 쓸모가 없다.
-- 공유 프로젝트라 표가 무한정 자라면 500MB 한도를 함께 쓰는 AIDAPEL 에도 영향이 간다.
create or replace function public.prune_api_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.api_requests where created_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_api_requests() from public, anon, authenticated;
grant execute on function public.prune_api_requests() to service_role;

comment on function public.record_usage is
  'LLM 호출 사용량 기록. user_id 는 auth.uid() 로 고정된다. 서버 라우트 전용.';
comment on function public.consume_rate_limit is
  '분당 호출 제한. 한도 안이면 기록하고 true, 넘으면 false.';
comment on function public.prune_api_requests is
  '하루 지난 속도 제한 기록 삭제. 가끔 SQL 편집기에서 select public.prune_api_requests(); 로 부른다.';
